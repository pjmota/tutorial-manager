# syntax=docker/dockerfile:1
FROM php:8.3-cli

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    apt-utils \
    build-essential \
    git \
    libicu-dev \
    libsqlite3-dev \
    libxml2-dev \
    libzip-dev \
    pkg-config \
    sqlite3 \
    unzip \
    zlib1g-dev \
 && docker-php-ext-configure intl \
 && docker-php-ext-install intl pdo pdo_sqlite zip \
 && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# 🔹 Primeiro copia apenas composer.* para usar cache
COPY composer.json composer.lock ./ 

RUN composer install --no-interaction --no-progress --no-scripts --prefer-dist

# 🔹 Agora copia o restante do código
COPY . .

# 🔹 Executa scripts do Symfony
RUN composer run-script post-install-cmd

RUN mkdir -p var && chown -R www-data:www-data var

ENV APP_ENV=prod \
    DATABASE_URL=sqlite:///var/data.sqlite \
    CORS_ALLOW_ORIGIN='^https?://localhost(:[0-9]+)?$'

EXPOSE 4000

CMD ["php", "-S", "0.0.0.0:4000", "-t", "public"]
