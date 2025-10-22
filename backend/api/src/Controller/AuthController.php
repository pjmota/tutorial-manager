<?php

namespace App\Controller;

use App\Entity\User;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use App\Entity\RefreshToken;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;

class AuthController extends AbstractController
{
    public function __construct(
        private Connection $db,
        private UserPasswordHasherInterface $passwordHasher,
        private JWTTokenManagerInterface $jwtManager,
        private EntityManagerInterface $em,
        private JWTEncoderInterface $jwtEncoder,
    ) {}

    #[Route('/api/users/authenticate', name: 'api_users_authenticate', methods: ['POST'])]
    public function authenticate(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            $data = $request->request->all();
        }

        $username = $this->sanitizeText($data['email'] ?? $data['username'] ?? null);
        $password = $data['password'] ?? null;

        $status = 200;
        $payload = [];

        if (!$username || !$password) {
            $status = 400;
            $payload = ['message' => 'email and password are required'];
        } else {
            $row = $this->db->executeQuery(
                'SELECT id, username, password, first_name, last_name, roles FROM users WHERE username = :NM_USUARIO',
                ['NM_USUARIO' => $username]
            )->fetchAssociative();

            if (!$row) {
                $status = 401;
                $payload = ['message' => 'Invalid credentials'];
            } else {
                $probe = new User();
                $probe->setUsername((string)$row['username']);
                $probe->setPassword((string)$row['password']);

                $roles = $this->parseRoles((string)($row['roles'] ?? ''));
                if (empty($roles)) {
                    $roles = ['ROLE_USER'];
                }
                $probe->setRoles($roles);

                if (!$this->passwordHasher->isPasswordValid($probe, (string)$password)) {
                    $status = 401;
                    $payload = ['message' => 'Invalid credentials'];
                } else {
                    $accessToken = $this->jwtManager->create($probe);

                    $refresh = new RefreshToken();
                    $refresh->setRefreshToken(bin2hex(random_bytes(64)));
                    $refresh->setUsername($probe->getUserIdentifier());
                    $refresh->setValid((new \DateTimeImmutable())->modify('+30 days'));
                    $this->em->persist($refresh);
                    $this->em->flush();

                    $payload = [
                        'id' => (int)$row['id'],
                        'username' => (string)$row['username'],
                        'firstName' => (string)$row['first_name'],
                        'lastName' => (string)$row['last_name'],
                        'roles' => $roles,
                        'token' => $accessToken,
                        'refreshToken' => $refresh->getRefreshToken(),
                        'expiresIn' => 900,
                    ];
                }
            }
        }

        return new JsonResponse($payload, $status);
    }

    #[Route('/api/users/register', name: 'api_users_register', methods: ['POST'])]
    public function register(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            $data = $request->request->all();
        }

        $username = $this->sanitizeText($data['email'] ?? $data['username'] ?? null);
        $password = $data['password'] ?? null;
        $firstName = $this->sanitizeText($data['firstName'] ?? '');
        $lastName = $this->sanitizeText($data['lastName'] ?? '');

        $status = 201;
        $payload = [];

        if (!$username || !$password) {
            $status = 400;
            $payload = ['message' => 'email and password are required'];
        } elseif (!filter_var($username, FILTER_VALIDATE_EMAIL)) {
            $status = 400;
            $payload = ['message' => 'A valid email is required'];
        } else {
            $exists = $this->db->executeQuery(
                'SELECT 1 FROM users WHERE username = :NM_USUARIO',
                ['NM_USUARIO' => $username]
            )->fetchOne();

            if ($exists) {
                $status = 409;
                $payload = ['message' => 'Email already exists'];
            } else {
                $userProbe = new User();
                $userProbe->setUsername($username);
                $hashed = $this->passwordHasher->hashPassword($userProbe, (string)$password);

                $sql = 'INSERT INTO users (username, roles, password, first_name, last_name) VALUES (:NM_USUARIO, :ROLES_JSON, :TX_SENHA, :NM_PRIMEIRO, :NM_ULTIMO)';
                $params = [
                    'NM_USUARIO' => $username,
                    'ROLES_JSON' => json_encode(['ROLE_USER']),
                    'TX_SENHA' => $hashed,
                    'NM_PRIMEIRO' => (string)$firstName,
                    'NM_ULTIMO' => (string)$lastName,
                ];
                $this->db->executeStatement($sql, $params);
                $id = (int)$this->db->lastInsertId();

                $row = $this->db->executeQuery(
                    'SELECT id, username, first_name, last_name, roles FROM users WHERE id = :ID_USUARIO',
                    ['ID_USUARIO' => $id]
                )->fetchAssociative();

                $probe = new User();
                $probe->setUsername((string)$row['username']);
                $roles = $this->parseRoles((string)($row['roles'] ?? ''));
                if (empty($roles)) {
                    $roles = ['ROLE_USER'];
                }
                $probe->setRoles($roles);

                $accessToken = $this->jwtManager->create($probe);
                $refresh = new RefreshToken();
                $refresh->setRefreshToken(bin2hex(random_bytes(64)));
                $refresh->setUsername($probe->getUserIdentifier());
                $refresh->setValid((new \DateTimeImmutable())->modify('+30 days'));
                $this->em->persist($refresh);
                $this->em->flush();

                $payload = [
                    'id' => (int)$row['id'],
                    'username' => (string)$row['username'],
                    'firstName' => (string)$row['first_name'],
                    'lastName' => (string)$row['last_name'],
                    'roles' => $roles,
                    'token' => $accessToken,
                    'refreshToken' => $refresh->getRefreshToken(),
                    'expiresIn' => 900,
                ];
            }
        }

        return new JsonResponse($payload, $status);
    }

    #[Route('/api/users', name: 'api_users_list', methods: ['GET'])]
    public function listUsers(): JsonResponse
    {
        if (!$this->isGranted('ROLE_ADMIN')) {
            return new JsonResponse(['message' => 'Forbidden'], 403);
        }
        $rows = $this->db->executeQuery(
            'SELECT id, username, first_name, last_name FROM users ORDER BY id ASC'
        )->fetchAllAssociative();

        $users = array_map(static function(array $r) {
            return [
                'id' => (int)$r['id'],
                'username' => (string)$r['username'],
                'firstName' => (string)$r['first_name'],
                'lastName' => (string)$r['last_name'],
            ];
        }, $rows);

        return new JsonResponse($users);
    }

    private function sanitizeText(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $value = trim($value);
        return $value === '' ? null : $value;
    }

    #[Route('/api/users/password/change', name: 'api_users_password_change', methods: ['POST'])]
    public function changePassword(Request $request): JsonResponse
    {
        try {
            $token = $this->requireBearerToken($request);
            $username = $this->decodeTokenUsernameOrFail($token);

            $data = $this->getRequestData($request);
            $current = (string)($data['currentPassword'] ?? '');
            $next = (string)($data['newPassword'] ?? '');
            $this->validateNewPasswordOrFail($current, $next);

            $row = $this->requireUserRow($username);
            $probe = $this->buildUserProbeFromRow($row);
            $this->requireCurrentPasswordValid($probe, $current);

            $hashed = $this->hashPasswordOrFail($probe, $next);
            $this->updatePasswordOrFail((int)($row['id'] ?? 0), $hashed);

            return new JsonResponse(['message' => 'Password changed successfully'], 200);
        } catch (\RuntimeException $e) {
            $status = $e->getCode() ?: 500;
            $message = $e->getMessage() ?: 'Internal error';
            return new JsonResponse(['message' => $message], $status);
        }
    }

    private function requireBearerToken(Request $request): string
    {
        $authHeader = (string)$request->headers->get('Authorization');
        if (!str_starts_with($authHeader, 'Bearer ')) {
            throw new UnauthorizedException('Unauthorized', 401);
        }
        return substr($authHeader, 7);
    }

    private function decodeTokenUsernameOrFail(string $token): string
    {
        try {
            $decoded = $this->jwtEncoder->decode($token);
        } catch (\Throwable $e) {
            throw new InvalidTokenException('Invalid token', 401);
        }
        if (!is_array($decoded)) {
            throw new InvalidTokenException('Invalid token', 401);
        }
        $username = (string)($decoded['username'] ?? $decoded['sub'] ?? '');
        if ($username === '') {
            throw new InvalidTokenPayloadException('Invalid token payload', 401);
        }
        return $username;
    }

    private function validateNewPasswordOrFail(?string $current, ?string $next): void
    {
        if (!$current || !$next) {
            throw new ValidationException('currentPassword and newPassword are required', 400);
        }
        if (strlen((string)$next) < 6) {
            throw new ValidationException('newPassword must be at least 6 characters', 400);
        }
    }

    private function requireUserRow(string $username): array
    {
        $row = $this->db->executeQuery(
            'SELECT id, username, password, roles FROM users WHERE username = :u',
            ['u' => $username]
        )->fetchAssociative();
        if (!$row) {
            throw new UserNotFoundException('User not found', 404);
        }
        return $row;
    }

    private function requireCurrentPasswordValid(User $probe, string $current): void
    {
        if (!$this->passwordHasher->isPasswordValid($probe, $current)) {
            throw new ValidationException('Current password is incorrect', 400);
        }
    }

    private function hashPasswordOrFail(User $probe, string $next): string
    {
        try {
            return $this->passwordHasher->hashPassword($probe, $next);
        } catch (\Throwable $e) {
            throw new HashingFailedException('Password hashing failed', 500);
        }
    }

    private function updatePasswordOrFail(int $id, string $hashed): void
    {
        try {
            $this->db->executeStatement(
                'UPDATE users SET password = :p WHERE id = :id',
                ['p' => $hashed, 'id' => $id]
            );
        } catch (\Throwable $e) {
            throw new DatabaseUpdateFailedException('Database update failed', 500);
        }
    }

    private function getRequestData(Request $request): array
    {
        $data = json_decode($request->getContent(), true);
        return is_array($data) ? $data : $request->request->all();
    }

    private function buildUserProbeFromRow(array $row): User
    {
        $probe = new User();
        $probe->setUsername((string)($row['username'] ?? ''));
        $probe->setPassword((string)($row['password'] ?? ''));
        $roles = $this->parseRoles((string)($row['roles'] ?? ''));
        if (empty($roles)) {
            $roles = ['ROLE_USER'];
        }
        $probe->setRoles($roles);
        return $probe;
    }

    private function parseRoles(string $raw): array
    {
        $roles = [];
        if ($raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $roles = $decoded;
            } else {
                $trimmed = trim($raw);
                if ($trimmed !== '') {
                    $trimmed = trim($trimmed, '[]');
                    $parts = array_filter(array_map('trim', explode(',', $trimmed)));
                    if (!empty($parts)) {
                        $roles = array_values(array_unique($parts));
                    }
                }
            }
        }
        return $roles;
    }
}

class UnauthorizedException extends \RuntimeException {}
class InvalidTokenException extends \RuntimeException {}
class InvalidTokenPayloadException extends \RuntimeException {}
class ValidationException extends \RuntimeException {}
class UserNotFoundException extends \RuntimeException {}
class HashingFailedException extends \RuntimeException {}
class DatabaseUpdateFailedException extends \RuntimeException {}
