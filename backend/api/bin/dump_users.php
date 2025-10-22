<?php

$dbPath = __DIR__ . '/../var/app.db';
if (!file_exists($dbPath)) {
    fwrite(STDERR, "Database not found at: {$dbPath}\n");
    exit(1);
}

try {
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (Throwable $e) {
    fwrite(STDERR, "Failed to open database: " . $e->getMessage() . "\n");
    exit(1);
}

try {
    $rows = $pdo->query('SELECT id, username, roles FROM users')->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    fwrite(STDERR, "Query failed: " . $e->getMessage() . "\n");
    exit(1);
}

if (!$rows) {
    echo "No users found.\n";
    exit(0);
}

foreach ($rows as $row) {
    $id = $row['id'] ?? null;
    $username = $row['username'] ?? '';
    $rolesRaw = $row['roles'] ?? '';
    $decoded = json_decode((string)$rolesRaw, true);
    $ok = is_array($decoded) ? 'valid' : 'invalid';
    echo "#{$id} {$username} roles={$rolesRaw} ({$ok})\n";
}

echo "Total: " . count($rows) . " user(s).\n";