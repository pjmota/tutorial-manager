<?php
// Simple RSA keypair generator for LexikJWT in dev environments
// Reads JWT_PASSPHRASE from ../.env and writes keys to ../config/jwt/

$envFile = __DIR__ . '/../.env';
$pass = '';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (str_starts_with($line, 'JWT_PASSPHRASE=')) {
            $pass = trim(substr($line, strlen('JWT_PASSPHRASE=')));
            break;
        }
    }
}

$config = [
    'digest_alg' => 'sha256',
    'private_key_bits' => 2048,
    'private_key_type' => OPENSSL_KEYTYPE_RSA,
];

$res = openssl_pkey_new($config);
if ($res === false) {
    fwrite(STDERR, "Failed to create RSA keypair\n");
    exit(1);
}

if (!openssl_pkey_export($res, $privKey, $pass)) {
    fwrite(STDERR, "Failed to export private key\n");
    exit(1);
}

$details = openssl_pkey_get_details($res);
if ($details === false || empty($details['key'])) {
    fwrite(STDERR, "Failed to get public key details\n");
    exit(1);
}
$pubKey = $details['key'];

$dir = __DIR__ . '/../config/jwt';
if (!is_dir($dir) && !mkdir($dir, 0777, true) && !is_dir($dir)) {
    fwrite(STDERR, "Failed to create jwt directory\n");
    exit(1);
}

file_put_contents($dir . '/private.pem', $privKey);
file_put_contents($dir . '/public.pem', $pubKey);

echo "OK\n";
