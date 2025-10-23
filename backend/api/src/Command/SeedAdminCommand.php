<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\User;
use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(name: 'app:seed-admin', description: 'Seed admin user when users table is empty')]
class SeedAdminCommand extends Command
{
    public function __construct(
        private Connection $db,
        private UserPasswordHasherInterface $hasher,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $adminEmail = getenv('ADMIN_EMAIL') ?: 'admin@test.local';
        $adminPassword = getenv('ADMIN_PASSWORD') ?: '123456';
        $seedFlag = getenv('ADMIN_SEED_WHEN_EMPTY');
        $seedWhenEmpty = $seedFlag === false ? true : !in_array(strtolower((string)$seedFlag), ['0', 'false', 'no'], true);

        if (!$seedWhenEmpty) {
            $output->writeln('<info>[seed-admin]</info> ADMIN_SEED_WHEN_EMPTY disabled. Skipping.');
            return Command::SUCCESS;
        }

        try {
            $count = (int)$this->db->executeQuery('SELECT COUNT(*) FROM users')->fetchOne();
        } catch (\Throwable $e) {
            $output->writeln('<comment>[seed-admin]</comment> Users table not ready or DB error: ' . $e->getMessage());
            return Command::SUCCESS; // don't fail startup
        }

        if ($count > 0) {
            $output->writeln(sprintf('<info>[seed-admin]</info> Users already present (%d). Skipping seed.', $count));
            return Command::SUCCESS;
        }

        try {
            $probe = new User();
            $probe->setUsername($adminEmail);
            $hashed = $this->hasher->hashPassword($probe, (string)$adminPassword);

            $sql = 'INSERT INTO users (username, roles, password, first_name, last_name) VALUES (:u, :r, :p, :f, :l)';
            $params = [
                'u' => $adminEmail,
                'r' => json_encode(['ROLE_ADMIN'], JSON_UNESCAPED_SLASHES),
                'p' => $hashed,
                'f' => 'Admin',
                'l' => 'User',
            ];

            $this->db->executeStatement($sql, $params);
            $id = (int)$this->db->lastInsertId();
            $output->writeln(sprintf('<info>[seed-admin]</info> Admin user created: id=%d email=%s', $id, $adminEmail));
            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $output->writeln('<error>[seed-admin]</error> Failed to create admin: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}