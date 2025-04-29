# Food Delivery System - Food Hub

## Table of Contents
- [1. Prerequisites](#1-prerequisites)
- [2. Backend Setup](#2-backend-setup)
- [3. Kubernetes Deployment](#3-kubernetes-deployment)
- [4. Frontend Setup](#4-frontend-setup)
- [5. Verify Installation](#5-verify-installation)
- [6. Troubleshooting](#6-troubleshooting)

## 1. Prerequisites

Ensure you have the following tools installed on your system:

- Git
- Docker Desktop
- kubectl (Kubernetes command-line tool)
- minikube (for local Kubernetes cluster) or access to a Kubernetes cluster
- Node.js and npm (for frontend development)

## 2. Backend Setup

### 2.1 Clone the Repository

```bash
git clone https://github.com/IT22056320/food-delivery-system-backend.git
cd food-delivery-system-backend
```

### 2.2 Configure Secret Files

Each microservice requires configuration via secret YAML files. Template files are provided, but you need to set up your own secret values.

1. Navigate to each microservice directory and copy the template secret files:

```bash
# For auth-service
cp k8s/auth-service/auth-secrets.yaml.template k8s/auth-service/auth-secrets.yaml

# For order-service
cp k8s/order-service/order-secrets.yaml.template k8s/order-service/order-secrets.yaml

# For restaurant-service
cp k8s/restaurant-service/restaurant-secrets.yaml.template k8s/restaurant-service/restaurant-secrets.yaml

# For delivery-service
cp k8s/delivery-service/delivery-secrets.yaml.template k8s/delivery-service/delivery-secrets.yaml

# For payment-service
cp k8s/payment-service/payment-secrets.yaml.template k8s/payment-service/payment-secrets.yaml

# For notification-service
cp k8s/notification-service/notification-secrets.yaml.template k8s/notification-service/notification-secrets.yaml
```

2. Edit each secrets file with your configuration values (database credentials, API keys, etc.)

## 3. Kubernetes Deployment

### 3.1 Start Your Kubernetes Cluster

If using minikube:

```bash
minikube start
```

### 3.2 Apply Kubernetes Configurations

Deploy all services with a single command:

```bash
kubectl apply -f k8s/
```

Alternatively, you can deploy services individually:

```bash
# Deploy auth service
kubectl apply -f k8s/auth-service/

# Deploy order service
kubectl apply -f k8s/order-service/

# Deploy restaurant service
kubectl apply -f k8s/restaurant-service/

# Deploy delivery service
kubectl apply -f k8s/delivery-service/

# Deploy payment service
kubectl apply -f k8s/payment-service/

# Deploy notification service
kubectl apply -f k8s/notification-service/
```

### 3.3 Verify Deployments

Check if all pods are running:

```bash
kubectl get pods
```

Check services:

```bash
kubectl get services
```

### 3.4 Set Up Ingress

Apply the ingress configuration:

```bash
kubectl apply -f k8s/restaurant-service/ingress.yaml
```

If using minikube, enable the ingress addon:

```bash
minikube addons enable ingress
```

## 4. Frontend Setup

### 4.1 Clone the Frontend Repository

```bash
git clone https://github.com/IT22056320/food-delivery-system-frontend.git
cd food-delivery-system-frontend
```

### 4.2 Install Dependencies

```bash
npm install
```

### 4.3 Configure Environment Variables

Copy the template environment file and modify it with your backend API endpoints:

```bash
cp .env.template .env.local
```

Edit `.env.local` to match your Kubernetes service endpoints.

### 4.4 Run the Frontend Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`.

## 5. Verify Installation

### 5.1 Test Backend Services

Verify that each microservice is accessible:

```bash
# Get the URL for accessing the services
kubectl get ingress

# Test auth service
curl http://<ingress-address>/api/auth/health

# Test order service
curl http://<ingress-address>/api/orders/health

# Test restaurant service
curl http://<ingress-address>/api/restaurants/health

# Test delivery service
curl http://<ingress-address>/api/delivery/health

# Test payment service
curl http://<ingress-address>/api/payments/health

# Test notification service
curl http://<ingress-address>/api/notifications/health
```

### 5.2 Access the Frontend

Open your browser and navigate to `http://localhost:3000` to access the food hub frontend.

## 6. Troubleshooting

### 6.1 Check Kubernetes Pod Logs

If a service is not working correctly, check its logs:

```bash
# List all pods
kubectl get pods

# View logs for a specific pod
kubectl logs <pod-name>
```

### 6.2 Check Kubernetes Events

```bash
kubectl get events
```

### 6.3 Common Issues

- **Secret Configuration**: Ensure all secret files are properly configured with valid credentials.
- **Network Connectivity**: Verify that services can communicate with each other and with any external dependencies.
- **Resource Constraints**: Check if your Kubernetes cluster has sufficient resources to run all services.
- **Ingress Setup**: Confirm that the ingress controller is properly configured and running.

### 6.4 Rebuilding Services

If you need to rebuild and redeploy a service:

```bash
# Delete the deployment
kubectl delete deployment <service-name>

# Apply the configuration again
kubectl apply -f k8s/<service-name>/
```
