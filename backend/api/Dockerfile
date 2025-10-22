# syntax=docker/dockerfile:1

# Base PHP image with CLI (uses built-in web server)
FROM php:8.3-cli

# Install system dependencies and PHP extensions needed for Symfony + SQLite
RUN apt-get update && apt-get install -y \
    git \
    libicu-dev \
    libzip-dev \
    unzip \
 && docker-php-ext-configure intl \
 && docker-php-ext-install pdo pdo_sqlite intl zip \
 && rm -rf /var/lib/apt/lists/*

# Install Composer (from official image)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy application source
COPY . .

# Install PHP dependencies and prepare runtime directory in a single layer
RUN composer install --no-interaction --no-progress --prefer-dist \
 && mkdir -p var \
 && chown -R www-data:www-data var

# Default environment (adjust as needed)
ENV APP_ENV=prod \
    DATABASE_URL=sqlite:///var/data.sqlite \
    CORS_ALLOW_ORIGIN='^https?://localhost(:[0-9]+)?$'

# Expose API port
EXPOSE 4000

# Start Symfony via PHP built-in server
CMD ["php", "-S", "0.0.0.0:4000", "-t", "public"]