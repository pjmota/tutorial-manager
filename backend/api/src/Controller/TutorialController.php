<?php

namespace App\Controller;

use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/tutorials')]
class TutorialController extends AbstractController
{
    private const ROUTE_ID = '/{id}';
    private const ERR_NOT_FOUND = 'Not found';
    private const SQL_TUTORIAL_BY_ID = '
                SELECT
                    ID,
                    TITLE,
                    DESCRIPTION,
                    PUBLISHED
                FROM
                    tutorials
                WHERE
                    ID = :ID_TUTORIAL
            ';

    public function __construct(private Connection $db) {}

    #[Route('', name: 'api_tutorials_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $titulo = $this->sanitizeTitle($request->query->get('title'));

        $sql = '
            SELECT
                ID,
                TITLE,
                DESCRIPTION,
                PUBLISHED
            FROM
                tutorials
        ';

        $params = [];
        if ($titulo !== null && $titulo !== '') {
            $sql .= '
            WHERE
                LOWER(TITLE) LIKE LOWER(:NM_TITULO_LIKE)
            ';
            $params['NM_TITULO_LIKE'] = '%' . strtolower($titulo) . '%';
        }

        $sql .= '
            ORDER BY
                ID ASC
        ';

        $rows = $this->db->executeQuery($sql, $params)->fetchAllAssociative();
        $data = array_map(fn(array $row) => $this->toFront($row), $rows);
        return new JsonResponse($data);
    }

    #[Route('', name: 'api_tutorials_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $body = json_decode($request->getContent(), true) ?? [];

        $NM_TITULO = $this->sanitizeTitle($body['title'] ?? null); // NOSONAR
        if (!$NM_TITULO) {
            return new JsonResponse(['message' => 'title is required'], 400);
        }
        $DS_DESCRICAO = $this->sanitizeDescription($body['description'] ?? null); // NOSONAR
        $IN_PUBLICADO = $this->sanitizePublished($body['published'] ?? false); // NOSONAR

        $sql = '
            INSERT INTO
                tutorials
                (TITLE, DESCRIPTION, PUBLISHED, CREATED_AT)
            VALUES
                (:NM_TITULO, :DS_DESCRICAO, :IN_PUBLICADO, :DT_CREATED_AT)
        ';
        $params = [
            'NM_TITULO' => $NM_TITULO,
            'DS_DESCRICAO' => $DS_DESCRICAO,
            'IN_PUBLICADO' => $IN_PUBLICADO ? 1 : 0,
            'DT_CREATED_AT' => (new \DateTimeImmutable())->format('Y-m-d H:i:s'),
        ];

        $this->db->executeStatement($sql, $params);
        $id = (int)$this->db->lastInsertId();

        $row = $this->db->executeQuery(
            self::SQL_TUTORIAL_BY_ID,
            ['ID_TUTORIAL' => $id]
        )->fetchAssociative();

        return new JsonResponse($this->toFront($row), 201);
    }

    #[Route(self::ROUTE_ID, name: 'api_tutorials_get', methods: ['GET'])]
    public function getOne(int $id): JsonResponse
    {
        $row = $this->db->executeQuery(
            self::SQL_TUTORIAL_BY_ID,
            ['ID_TUTORIAL' => $id]
        )->fetchAssociative();

        if (!$row) {
            return new JsonResponse(['message' => self::ERR_NOT_FOUND], 404);
        }

        return new JsonResponse($this->toFront($row));
    }

    #[Route(self::ROUTE_ID, name: 'api_tutorials_update', methods: ['PUT', 'PATCH'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $exists = $this->db->executeQuery(
            '
                SELECT
                    ID
                FROM
                    tutorials
                WHERE
                    ID = :ID_TUTORIAL
            ',
            ['ID_TUTORIAL' => $id]
        )->fetchOne();
        if (!$exists) {
            return new JsonResponse(['message' => self::ERR_NOT_FOUND], 404);
        }

        $body = json_decode($request->getContent(), true) ?? [];
        $sets = [];
        $params = ['ID_TUTORIAL' => $id];

        if (array_key_exists('title', $body)) {
            $params['NM_TITULO'] = $this->sanitizeTitle($body['title']);
            $sets[] = 'TITLE = :NM_TITULO';
        }

        if (array_key_exists('description', $body)) {
            $params['DS_DESCRICAO'] = $this->sanitizeDescription($body['description']);
            $sets[] = 'DESCRIPTION = :DS_DESCRICAO';
        }

        if (array_key_exists('published', $body)) {
            $params['IN_PUBLICADO'] = $this->sanitizePublished($body['published']) ? 1 : 0;
            $sets[] = 'PUBLISHED = :IN_PUBLICADO';
        }

        if (empty($sets)) {
            $row = $this->db->executeQuery(
                self::SQL_TUTORIAL_BY_ID,
                ['ID_TUTORIAL' => $id]
            )->fetchAssociative();
            return new JsonResponse($this->toFront($row));
        }

        $sql = '
            UPDATE
                tutorials
            SET
                ' . implode(",\n                ", $sets) . '
            WHERE
                id = :ID_TUTORIAL
        ';
        $this->db->executeStatement($sql, $params);

        $row = $this->db->executeQuery(
            self::SQL_TUTORIAL_BY_ID,
            ['ID_TUTORIAL' => $id]
        )->fetchAssociative();
        return new JsonResponse($this->toFront($row));
    }

    #[Route(self::ROUTE_ID, name: 'api_tutorials_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $affected = $this->db->executeStatement(
            '
                DELETE FROM
                    tutorials
                WHERE
                    ID = :ID_TUTORIAL
            ',
            ['ID_TUTORIAL' => $id]
        );
        if ($affected === 0) {
            return new JsonResponse(['message' => self::ERR_NOT_FOUND], 404);
        }
        return new JsonResponse(null, 204);
    }

    private function toFront(?array $row): array
    {
        if (!$row) {
            return [];
        }
        return [
            'id' => isset($row['ID']) ? (int)$row['ID'] : null,
            'title' => isset($row['TITLE']) ? (string)trim((string)$row['TITLE']) : '',
            'description' => array_key_exists('DESCRIPTION', $row) && $row['DESCRIPTION'] !== null
                ? (string)trim((string)$row['DESCRIPTION'])
                : null,
            'published' => isset($row['PUBLISHED']) ? (bool)$row['PUBLISHED'] : false,
        ];
    }

    private function sanitizeTitle(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $value = trim($value);
        return $value === '' ? null : $value;
    }

    private function sanitizeDescription($value): ?string
    {
        if ($value === null) {
            return null;
        }
        $value = trim((string)$value);
        return $value === '' ? null : $value;
    }

    private function sanitizePublished($value): bool
    {
        if (is_string($value)) {
            $v = strtolower(trim($value));
            return in_array($v, ['1', 'true', 'yes', 'sim'], true);
        }
        return (bool)$value;
    }
}
