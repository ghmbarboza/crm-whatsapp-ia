---
url: "https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker"
title: "Docker - Documentação do Evolution Foundation"
---

> ## Documentation Index
>
> Fetch the complete documentation index at: [/llms.txt](https://docs.evolutionfoundation.com.br/llms.txt)
>
> Use this file to discover all available pages before exploring further.

[Skip to main content](https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker#content-area)

[Início](https://docs.evolutionfoundation.com.br/en) [Evolution](https://docs.evolutionfoundation.com.br/en/evolution-api) [Evo CRM](https://docs.evolutionfoundation.com.br/en/introduction) [EvoNexus](https://docs.evolutionfoundation.com.br/en/evo-nexus/introduction) [Referência API](https://docs.evolutionfoundation.com.br/en/api-reference/introduction)

**Prerequisites:** Before proceeding with the installation of Evolution API v2 using Docker, make sure you have already configured the necessary services, such as PostgreSQL and Redis. Follow the links below for more details:

- [Database Configuration](https://docs.evolutionfoundation.com.br/en/evolution-api/requirements/database)
- [Redis Configuration](https://docs.evolutionfoundation.com.br/en/evolution-api/requirements/redis)

These installation instructions assume that you have already installed Docker on your machine. You can find information on how to install Docker in the
[Official Docker Documentation](https://docs.docker.com/engine/install/).

Evolution API v2 is Docker-ready and can be easily deployed with Docker in standalone or swarm mode.
The official Evolution API repository contains all the necessary composition files to install and run the API.

## [​](https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker\#docker-compose)  Docker Compose

Deploying Evolution API v2 using Docker Compose simplifies the setup and management of your Docker containers.
It allows you to define your Docker environment in a `docker-compose.yaml` file and then use a single command to start everything.

### [​](https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker\#docker-compose-file)  Docker Compose File

The following example illustrates how to configure Docker Compose for standalone environments, i.e., a single running server.
For syncing two servers in parallel or for greater scalability, use Docker Swarm, recommended for more advanced users.

#### [​](https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker\#standalone-configuration)  Standalone Configuration

**Attention:** The commands described here as `docker compose` may not work in older versions of Docker.
If you are using an older version, replace with `docker-compose`.

Docker standalone is suitable when Evolution API will run on just one machine, without the need for immediate scalability.
This is the most convenient method for most users.To get started, create a `docker-compose.yml` file with the following content:

```
version: '3.9'
services:
  evolution-api:
    container_name: evolution_api
    image: evoapicloud/evolution-api:v2.1.1
    restart: always
    ports:
      - "8080:8080"
    env_file:
      - .env
    volumes:
      - evolution_instances:/evolution/instances

volumes:
  evolution_instances:
```

Next, create a `.env` file in the same directory with the following minimal content:

```
AUTHENTICATION_API_KEY=change-me
```

For more configurations, you can get the example file from the
[official repository](https://github.com/evolution-foundation/evolution-api/blob/main/.env.example). Also, check the environment variables guide [here](https://docs.evolutionfoundation.com.br/en/evolution-api/configuration/env).

### [​](https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker\#starting-the-api)  Starting the API

Navigate to the directory containing the `docker-compose.yml` file and run the following command to start the services defined in the file:

```
docker compose up -d
```

This command will download the necessary Docker images, create the defined services, networks, and volumes, and start the Evolution API service.

### [​](https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker\#checking-the-logs)  Checking the Logs

After running the `docker compose up` command, you can check the logs to confirm that the services are running correctly:

```
docker logs evolution_api
```

### [​](https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker\#stopping-the-service)  Stopping the Service

To stop the service, use the command:

```
docker compose down
```

### [​](https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker\#accessing-the-api)  Accessing the API

Open your browser and go to [http://localhost:8080](http://localhost:8080/) to check if the Evolution API is operational.

## [​](https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker\#docker-swarm)  Docker Swarm

To set up and manage a Docker Swarm cluster for Evolution API v2, follow the instructions below. Docker Swarm is ideal for environments that require scalability and high availability.

### [​](https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker\#docker-swarm-installation)  Docker Swarm Installation

#### [​](https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker\#configuring-the-manager-server)  Configuring the Manager Server

If you are using a Hetzner server, run:

```
sudo apt-get update && apt-get install -y apparmor-utils
```

**Step 1: Hostname Configuration**

1. Change the machine’s hostname to identify it in the cluster:

```
hostnamectl set-hostname manager1
```

2. Edit the `/etc/hosts` file to add the new name:

```
nano /etc/hosts
```

Add the line:

```
127.0.0.1    manager1
```

3. Reboot the system to apply the changes:

```
reboot
```

4. Check the hostname:

```
hostnamectl
```

**Step 2: Docker Installation**Install Docker by running:

```
curl -fsSL https://get.docker.com | bash
```

**Step 3: Starting the Swarm**Start Docker Swarm:

```
docker swarm init --advertise-addr IP_SERVER
```

**Step 4: Docker Swarm Network Configuration**Create the overlay network for Docker Swarm:

```
docker network create --driver=overlay network_public
```

Note the command generated to register the Workers:

```
docker swarm join --token HASH IP_SERVER:2377
```

#### [​](https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker\#configuring-the-worker-server)  Configuring the Worker Server

If you are using a Hetzner server, run:

```
sudo apt-get update && apt-get install -y apparmor-utils
```

**Step 1: Hostname Configuration**

1. Change the machine’s hostname to identify it in the cluster:

```
hostnamectl set-hostname worker1
```

2. Edit the `/etc/hosts` file to add the new name:

```
nano /etc/hosts
```

Add the line:

```
127.0.0.1    worker1
```

3. Reboot the system to apply the changes:

```
reboot
```

**Step 2: Docker Installation**Install Docker by running:

```
curl -fsSL https://get.docker.com | bash
```

**Step 3: Adding the Worker to the Cluster**Run the previously obtained command to add the Worker to the cluster:

```
docker swarm join --token HASH IP_SERVER:2377
```

### [​](https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker\#prerequisites-for-evolution-api-via-swarm)  Prerequisites for Evolution API via Swarm

#### [​](https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker\#installing-traefik)  Installing Traefik

To install Traefik on Docker Swarm, follow the instructions below:

1. On the manager server, create a `traefik.yaml` file:

```
nano traefik.yaml
```

2. Add the following content to the file:

```
version: "3.7"

services:
  traefik:
    image: traefik:2.11.2
    command:
      - "--api.dashboard=true"
      - "--providers.docker.swarmMode=true"
      - "--providers.docker.endpoint=unix:///var/run/docker.sock"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.docker.network=network_public"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entryPoint.to=websecure"
      - "--entrypoints.web.http.redirections.entryPoint.scheme=https"
      - "--entrypoints.web.http.redirections.entrypoint.permanent=true"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencryptresolver.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencryptresolver.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencryptresolver.acme.email=your@email.com"
      - "--certificatesresolvers.letsencryptresolver.acme.storage=/etc/traefik/letsencrypt/acme.json"
      - "--log.level=DEBUG"
      - "--log.format=common"
      - "--log.filePath=/var/log/traefik/traefik.log"
      - "--accesslog=true"
      - "--accesslog.filepath=/var/log/traefik/access-log"
    deploy:
      placement:
        constraints:
          - node.role == manager
      restart_policy:
        condition: on-failure
        delay: 5s
      labels:
        - "traefik.enable=true"
        - "traefik.http.middlewares.redirect-https.redirectscheme.scheme=https"
        - "traefik.http.middlewares.redirect-https.redirectscheme.permanent=true"
        - "traefik.http.routers.http-catchall.rule=hostregexp(`{host:.+}`)"
        - "traefik.http.routers.http-catchall.entrypoints=web"
        - "traefik.http.routers.http-catchall.middlewares=redirect-https@docker"
        - "traefik.http.routers.http-catchall.priority=1"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "vol_certificates:/etc/traefik/letsencrypt"
    ports:
      - target: 80
        published: 80
        mode: host
      - target: 443
        published: 443
        mode: host
    networks:
      - network_public

volumes:
  vol_certificates:
    external: true
    name: volume_swarm_certificates

networks:
  network_public:
    external: true
    name: network_public
```

3. Run the following command to deploy the Traefik stack:

```
docker stack deploy --prune --resolve-image always -c traefik.yaml traefik
```

### [​](https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker\#deploying-evolution-api-v2)  Deploying Evolution API v2

Finally, to deploy Evolution API v2 on Docker Swarm, use the configuration file available [here](https://github.com/evolution-foundation/evolution-api/blob/main/Docker/swarm/evolution_api_v2.yaml) with the following content:

```
version: "3.7"

services:
  evolution_v2:

    image: evoapicloud/evolution-api:v2.1.1
    volumes:
      - evolution_instances:/evolution/instances
    networks:
      - network_public
    environment:
      - SERVER_URL=https://evo2.site.com
      - DEL_INSTANCE=false
      - DATABASE_ENABLED=true
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://postgres:PASSWORD@postgres:5432/evolution
      - DATABASE_SAVE_DATA_INSTANCE=true
      - DATABASE_SAVE_DATA_NEW_MESSAGE=true
      - DATABASE_SAVE_MESSAGE_UPDATE=true
      - DATABASE_SAVE_DATA_CONTACTS=true
      - DATABASE_SAVE_DATA_CHATS=true
      - DATABASE_SAVE_DATA_LABELS=true
      - DATABASE_SAVE_DATA_HISTORIC=true
      - DATABASE_CONNECTION_CLIENT_NAME=evolution_v2
      - RABBITMQ_ENABLED=false
      - RABBITMQ_URI=amqp://admin:admin@rabbitmq:5672/default
      - CACHE_REDIS_ENABLED=true
      - CACHE_REDIS_URI=redis://evo_redis:6379/1
      - CACHE_REDIS_PREFIX_KEY=evolution_v2
      - CACHE_REDIS_SAVE_INSTANCES=false
      - CACHE_LOCAL_ENABLED=false
      - S3_ENABLED=true
      - S3_ACCESS_KEY=
      - S3_SECRET_KEY=
      - S3_BUCKET=evolution
      - S3_PORT=443
      - S3_ENDPOINT=files.site.com
      - S3_USE_SSL=true
      - AUTHENTICATION_API_KEY=429683C4C977415CAAFCCE10F7D57E11
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.hostname == evolution-manager
      labels:
        - traefik.enable=true
        - traefik.http.routers.evolution_v2.rule=Host(`evo2.site.com`)
        - traefik.http.routers.evolution_v2.entrypoints=websecure
        - traefik.http.routers.evolution_v2.tls.certresolver=letsencryptresolver
        - traefik.http.routers.evolution_v2.service=evolution_v2
        - traefik.http.services.evolution_v2.loadbalancer.server.port=8080
        - traefik.http.services.evolution_v2.loadbalancer.passHostHeader=true

volumes:
  evolution_instances:
    external: true
    name: evolution_v2_data

networks:
  network_public:
    external: true
    name: network_public
```

After configuring and saving the file, deploy the stack with the command:

```
docker stack deploy --prune --resolve-image always -c evolution_api_v2.yaml evolution_v2
```

### [​](https://docs.evolutionfoundation.com.br/en/evolution-api/install/docker\#accessing-the-api-2)  Accessing the API

Open your browser and go to [https://evo2.site.com](https://evo2.site.com/) to check if the Evolution API is operational.

[Previous](https://docs.evolutionfoundation.com.br/en/evolution-api/requirements/redis) [NVM\\
\\
Next](https://docs.evolutionfoundation.com.br/en/evolution-api/install/nvm)

Ctrl+I