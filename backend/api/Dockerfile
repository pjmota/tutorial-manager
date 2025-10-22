# syntax=docker/dockerfile:1
FROM php:8.3-cli

ENV DEBIAN_FRONTEND=noninteractive

# Instala dependências do sistema necessárias para intl e zip
RUN apt-get update && apt-get install -y --no-install-recommends \
    apt-utils \
    build-essential \
    git \
    libicu-dev \
    libxml2-dev \
    libzip-dev \
    unzip \
    zlib1g-dev \
    pkg-config \
 && docker-php-ext-configure intl \
 && docker-php-ext-install intl pdo pdo_sqlite zip \
 && rm -rf /var/lib/apt/lists/*

# Instala o Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-interaction --no-progress --prefer-dist

COPY . .

RUN mkdir -p var && chown -R www-data:www-data var

ENV APP_ENV=prod \
    DATABASE_URL=sqlite:///var/data.sqlite \
    CORS_ALLOW_ORIGIN='^https?://localhost(:[0-9]+)?$'

EXPOSE 4000

CMD ["php", "-S", "0.0.0.0:4000", "-t", "public"]
