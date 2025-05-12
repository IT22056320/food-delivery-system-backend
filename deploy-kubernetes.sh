#!/bin/bash

# Create secrets from templates
kubectl create -f k8s/auth-service/auth-secrets-template.yaml
kubectl create -f k8s/restaurant-service/restaurant-secrets-template.yaml
kubectl create -f k8s/order-service/order-secrets-template.yaml
kubectl create -f k8s/delivery-service/delivery-secrets-template.yaml
kubectl create -f k8s/notification-service/notification-secrets-template.yaml
kubectl create -f k8s/frontend/frontend-secrets-template.yaml

# Deploy services
kubectl apply -f k8s/auth-service/auth-deployment.yaml
kubectl apply -f k8s/auth-service/auth-service.yaml

kubectl apply -f k8s/restaurant-service/restaurant-deployment.yaml
kubectl apply -f k8s/restaurant-service/restaurant-service.yaml

kubectl apply -f k8s/order-service/order-deployment.yaml
kubectl apply -f k8s/order-service/order-service.yaml

kubectl apply -f k8s/delivery-service/delivery-deployment.yaml
kubectl apply -f k8s/delivery-service/delivery-service.yaml

kubectl apply -f k8s/notification-service/notification-deployment.yaml
kubectl apply -f k8s/notification-service/notification-service.yaml

kubectl apply -f k8s/frontend/frontend-deployment.yaml
kubectl apply -f k8s/frontend/frontend-service.yaml

# Deploy ingress
kubectl apply -f k8s/ingress.yaml

echo "All services deployed successfully!"
