<?php

declare(strict_types=1);

// Seed an admin user automatically when the database is empty.
// Reads envs: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SEED_WHEN_EMPTY (default true)

require dirname(__DIR__) . '/vendor/autoload.php';

$env = getenv('APP_ENV') ?: 'prod';
$debug = false;

$kernel = new \App\Kernel($env, $debug);
$kernel->boot();
$container = $kernel->getContainer();

/** @var \Doctrine\Persistence\ManagerRegistry $doctrine */
$doctrine = $container->get('doctrine');
$db = $doctrine->getConnection(); // ✅ obtém a conexão de forma compatível com prod

/** @var \Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface $hasher */
$hasher = $container->get('security.user_password_hasher');

$adminEmail = getenv('ADMIN_EMAIL') ?: 'admin@test.local';
$adminPassword = getenv('ADMIN_PASSWORD') ?: '123456';
$seedFlag = getenv('ADMIN_SEED_WHEN_EMPTY');
$seedWhenEmpty = $seedFlag === false ? true : !in_array(strtolower((string)$seedFlag), ['0', 'false', 'no'], true);

if (!$seedWhenEmpty) {
    fwrite(STDOUT, "[seed-admin] ADMIN_SEED_WHEN_EMPTY is disabled. Skipping.\n");
    exit(0);
}

try {
    // Ensure users table exists and check if it's empty
    $count = (int)$db->executeQuery('SELECT COUNT(*) FROM users')->fetchOne();
} catch (\Throwable $e) {
    fwrite(STDOUT, "[seed-admin] Users table not ready or DB error: " . $e->getMessage() . "\n");
    exit(0);
}

if ($count > 0) {
    fwrite(STDOUT, "[seed-admin] Users already present ($count). Skipping seed.\n");
    exit(0);
}

try {
    $probe = new \App\Entity\User();
    $probe->setUsername($adminEmail);
    $hashed = $hasher->hashPassword($probe, (string)$adminPassword);

    $sql = 'INSERT INTO users (username, roles, password, first_name, last_name) VALUES (:u, :r, :p, :f, :l)';
    $params = [
        'u' => $adminEmail,
        'r' => json_encode(['ROLE_ADMIN'], JSON_UNESCAPED_SLASHES),
        'p' => $hashed,
        'f' => 'Admin',
        'l' => 'User',
    ];

    $db->executeStatement($sql, $params);
    $id = (int)$db->lastInsertId();

    fwrite(STDOUT, "[seed-admin] Admin user created: id={$id} email={$adminEmail}\n");
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[seed-admin] Failed to create admin: " . $e->getMessage() . "\n");
    exit(1);
}