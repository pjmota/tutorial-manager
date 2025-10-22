<?php

// Simple utility to normalize legacy roles format in SQLite users table
// Legacy format example: [ROLE_ADMIN,ROLE_USER]
// Normalized JSON: ["ROLE_ADMIN","ROLE_USER"]

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

$rows = $pdo->query('SELECT id, roles FROM users')->fetchAll(PDO::FETCH_ASSOC);
$updated = 0;
foreach ($rows as $row) {
    $id = (int)($row['id'] ?? 0);
    $rolesRaw = (string)($row['roles'] ?? '');
    if ($rolesRaw === '') {
        continue; // skip empty
    }
    $decoded = json_decode($rolesRaw, true);
    if (is_array($decoded)) {
        // already valid JSON
        continue;
    }
    // Attempt to parse legacy format
    $trimmed = trim($rolesRaw);
    $trimmed = trim($trimmed, '[]');
    $parts = array_filter(array_map('trim', explode(',', $trimmed)));
    if (!$parts) {
        // fallback to ROLE_USER
        $parts = ['ROLE_USER'];
    }
    // Ensure uniqueness
    $parts = array_values(array_unique($parts));
    $normalized = json_encode($parts);
    $stmt = $pdo->prepare('UPDATE users SET roles = :roles WHERE id = :id');
    $stmt->execute([':roles' => $normalized, ':id' => $id]);
    $updated++;
}

echo "Normalized roles for {$updated} user(s).\n";