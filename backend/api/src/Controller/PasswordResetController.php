<?php

namespace App\Controller;

use Doctrine\DBAL\Connection;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;

class PasswordResetController extends AbstractController
{
    public function __construct(
        private Connection $db,
        private JWTTokenManagerInterface $jwtManager,
        private JWTEncoderInterface $jwtEncoder,
        private UserPasswordHasherInterface $passwordHasher,
        private MailerInterface $mailer,
    ) {
    }

    #[Route('/api/users/password-reset/request', name: 'api_password_reset_request', methods: ['POST'])]
    public function requestReset(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $email = trim((string)($data['email'] ?? ''));

        $status = 200;
        $payload = ['message' => 'Se o e-mail existir, enviaremos um link de redefinição.'];

        if ($email === '') {
            $status = 400;
            $payload = ['message' => 'E-mail é obrigatório'];
        } else {
            $row = $this->findUserByEmail($email);
            if ($row) {
                $username = (string)$row['username'];
                $token = $this->createResetTokenForUsername($username);
                $resetLink = $this->buildResetLink($token);
                $from = $this->resolveMailerFrom();

                $fullName = trim(((string)$row['first_name']) . ' ' . ((string)$row['last_name']));
                $displayName = $fullName !== '' ? $fullName : $username;
                $subject = 'Redefinição de senha';
                $body = $this->buildResetEmailBody($displayName, $resetLink);

                $dispatched = $this->sendResetEmail($from, $email, $subject, $body);

                if ($this->shouldExposeMailStatus()) {
                    $payload['dispatched'] = $dispatched;
                    $payload['transport'] = $this->getMailerTransport();
                }
            }
        }

        return new JsonResponse($payload, $status);
    }

    #[Route('/api/users/password-reset/confirm', name: 'api_password_reset_confirm', methods: ['POST'])]
    public function confirmReset(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $token = (string)($data['token'] ?? '');
        $newPassword = (string)($data['password'] ?? '');

        $status = 200;
        $responsePayload = [];

        if ($token === '' || $newPassword === '') {
            $status = 400;
            $responsePayload = ['message' => 'Token e nova senha são obrigatórios'];
        } else {
            $check = $this->validateTokenAndPayload($token);
            if (!$check['ok']) {
                $status = $check['status'];
                $responsePayload = ['message' => (string)$check['message']];
            } else {
                $uid = (string)$check['uid'];
                $userRow = $this->findUserRow($uid);
                if (!$userRow) {
                    $status = 404;
                    $responsePayload = ['message' => 'Usuário não encontrado'];
                } else {
                    $hash = $this->hashForUser($uid, $newPassword);
                    $this->updateUserPassword((int)$userRow['id'], $hash);
                    $responsePayload = ['message' => 'Senha atualizada com sucesso'];
                }
            }
        }

        return new JsonResponse($responsePayload, $status);
    }

    private function validateTokenAndPayload(string $token): array
    {
        $status = 200;
        $message = null;
        $uid = null;
        $payload = null;

        try {
            $payload = $this->jwtEncoder->decode($token);
        } catch (\Throwable $e) {
            $status = 400;
            $message = 'Token inválido';
        }

        if ($message === null) {
            if (!is_array($payload) || (string)($payload['purpose'] ?? '') !== 'reset_password') {
                $status = 400;
                $message = 'Token inválido';
            } else {
                $uid = (string)($payload['uid'] ?? '');
                $exp = (int)($payload['exp'] ?? 0);
                if ($uid === '' || ($exp > 0 && $exp < time())) {
                    $status = 400;
                    $message = 'Token expirado';
                }
            }
        }

        return [
            'ok' => $status === 200 && $message === null,
            'status' => $status,
            'message' => $message,
            'uid' => $uid,
        ];
    }

    private function findUserRow(string $uid): ?array
    {
        $row = $this->db->executeQuery(
            'SELECT id, username FROM users WHERE username = :uid',
            ['uid' => $uid]
        )->fetchAssociative();

        return $row ?: null;
    }

    private function hashForUser(string $uid, string $newPassword): string
    {
        $probe = new \App\Entity\User();
        $probe->setUsername($uid);
        return $this->passwordHasher->hashPassword($probe, $newPassword);
    }

    private function updateUserPassword(int $id, string $hash): void
    {
        $this->db->executeStatement(
            'UPDATE users SET password = :HASH WHERE id = :ID',
            ['HASH' => $hash, 'ID' => $id]
        );
    }

    private function findUserByEmail(string $email): ?array
    {
        return $this->db->executeQuery(
            'SELECT id, username, first_name, last_name FROM users WHERE username = :email',
            ['email' => $email]
        )->fetchAssociative() ?: null;
    }

    private function createResetTokenForUsername(string $username): string
    {
        $probe = new \App\Entity\User();
        $probe->setUsername($username);
        $probe->setRoles(['ROLE_USER']);

        $expiresAt = (new \DateTimeImmutable('+30 minutes'))->getTimestamp();
        return $this->jwtManager->createFromPayload($probe, [
            'purpose' => 'reset_password',
            'uid' => $username,
            'exp' => $expiresAt,
        ]);
    }

    private function buildResetLink(string $token): string
    {
        $frontendUrl = (string)($_ENV['FRONTEND_URL'] ?? 'http://localhost:4200');
        return rtrim($frontendUrl, '/') . '/reset-password/' . $token;
    }

    private function resolveMailerFrom(): string
    {
        try {
            $this->db->executeStatement('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
        } catch (\Throwable $e) {
            // Ignorar falha ao criar tabela de settings.
        }

        try {
            $fromSetting = $this->db->executeQuery('SELECT value FROM settings WHERE key = :k', ['k' => 'MAILER_FROM'])->fetchOne();
        } catch (\Throwable $e) {
            $fromSetting = null;
        }

        return (string)($fromSetting ?: ($_ENV['MAILER_FROM'] ?? 'no-reply@localhost'));
    }

    private function buildResetEmailBody(string $displayName, string $resetLink): string
    {
        return sprintf(
            "Olá %s,\n\nRecebemos uma solicitação para redefinir sua senha.\nClique no link abaixo para criar uma nova senha (válido por 30 minutos):\n\n%s\n\nSe você não solicitou essa alteração, ignore este e-mail.",
            $displayName,
            $resetLink
        );
    }

    private function sendResetEmail(string $from, string $to, string $subject, string $body): bool
    {
        try {
            $emailMessage = (new Email())
                ->from($from)
                ->to($to)
                ->subject($subject)
                ->text($body);
            $this->mailer->send($emailMessage);
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    private function shouldExposeMailStatus(): bool
    {
        return filter_var((string)($_ENV['EXPOSE_MAIL_STATUS'] ?? 'false'), FILTER_VALIDATE_BOOLEAN);
    }

    private function getMailerTransport(): string
    {
        return (string)($_ENV['MAILER_DSN'] ?? 'unknown');
    }
}
