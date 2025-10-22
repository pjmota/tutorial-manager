<?php

namespace App\Controller;

use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

class SettingsController extends AbstractController
{
    public function __construct(private Connection $db) {}

    private function ensureSettingsTable(): void
    {
        // Cria a tabela de configurações se não existir
        // chave simples para armazenar pares key/value
        $sql = 'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)';
        try {
            $this->db->executeStatement($sql);
        } catch (\Throwable $e) {
            // Ignorar falha de criação; endpoints irão lidar com erros posteriormente
        }
    }

    #[Route('/api/settings/mailer-from', name: 'api_settings_mailer_get', methods: ['GET'])]
    public function getMailerFrom(): JsonResponse
    {
        // Somente admin pode ler/alterar configurações
        if (!$this->isGranted('ROLE_ADMIN')) {
            return new JsonResponse(['message' => 'Forbidden'], 403);
        }
        $this->ensureSettingsTable();
        $value = null;
        try {
            $value = $this->db->executeQuery('SELECT value FROM settings WHERE key = :k', ['k' => 'MAILER_FROM'])->fetchOne();
        } catch (\Throwable $e) {
            // Ignorar erros e usar fallback
        }
        $email = (string)($value ?: ($_ENV['MAILER_FROM'] ?? 'no-reply@localhost'));
        return new JsonResponse(['email' => $email]);
    }

    #[Route('/api/settings/mailer-from', name: 'api_settings_mailer_set', methods: ['POST'])]
    public function setMailerFrom(Request $request): JsonResponse
    {
        if (!$this->isGranted('ROLE_ADMIN')) {
            return new JsonResponse(['message' => 'Forbidden'], 403);
        }
        $this->ensureSettingsTable();
    
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            $data = $request->request->all();
        }
        $email = trim((string)($data['email'] ?? ''));
    
        $status = 200;
        $payload = [];
    
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $status = 400;
            $payload = ['message' => 'A valid email is required'];
        } else {
            try {
                $this->db->executeStatement(
                    'INSERT INTO settings(key, value) VALUES(:k, :v) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
                    ['k' => 'MAILER_FROM', 'v' => $email]
                );
                $payload = ['email' => $email];
            } catch (\Throwable $e) {
                $status = 500;
                $payload = ['message' => 'Failed to persist setting', 'error' => $e->getMessage()];
            }
        }
    
        return new JsonResponse($payload, $status);
    }
}
