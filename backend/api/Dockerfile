# syntax=docker/dockerfile:1
FROM php:8.3-cli

# Evita prompts interativos
ENV DEBIAN_FRONTEND=noninteractive

# Instala dependências do sistema e extensões PHP necessárias
RUN apt-get update && apt-get install -y --no-install-recommends \
    apt-utils \
    build-essential \
    git \
    libicu-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    pkg-config \
    unzip \
    zlib1g-dev \
 && docker-php-ext-configure intl \
 && docker-php-ext-install pdo pdo_sqlite intl zip \
 && rm -rf /var/lib/apt/lists/*

# Instala Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copia composer.json e composer.lock primeiro para aproveitar cache
COPY composer.json composer.lock ./
RUN composer install --no-interaction --no-progress --prefer-dist

# Copia o restante do código
COPY . .

# Garante que a pasta var/ tenha permissão
RUN mkdir -p var && chown -R www-data:www-data var

# Variáveis de ambiente padrão
ENV APP_ENV=prod \
    DATABASE_URL=sqlite:///var/data.sqlite \
    CORS_ALLOW_ORIGIN='^https?://localhost(:[0-9]+)?$'

# Expor porta
EXPOSE 4000

# Comando para iniciar Symfony
CMD ["php", "-S", "0.0.0.0:4000", "-t", "public"]
