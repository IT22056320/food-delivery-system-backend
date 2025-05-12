#!/bin/bash

# Set your Docker Hub username
DOCKER_USERNAME="pastadudde"

# Build and push Auth Service
cd services/auth-service
docker build -t $DOCKER_USERNAME/auth-service .
docker push $DOCKER_USERNAME/auth-service
cd ../..

# Build and push Restaurant Service
cd services/restaurant-service
docker build -t $DOCKER_USERNAME/restaurant-service .
docker push $DOCKER_USERNAME/restaurant-service
cd ../..

# Build and push Order Service
cd services/order-service
docker build -t $DOCKER_USERNAME/order-service .
docker push $DOCKER_USERNAME/order-service
cd ../..

# Build and push Delivery Service
cd services/delivery-service
docker build -t $DOCKER_USERNAME/delivery-service .
docker push $DOCKER_USERNAME/delivery-service
cd ../..

# Build and push Notification Service
cd services/notification-service
docker build -t $DOCKER_USERNAME/notification-service .
docker push $DOCKER_USERNAME/notification-service
cd ../..

# Build and push Frontend
cd ../food-delivery-system-frontend
docker build -t $DOCKER_USERNAME/frontend .
docker push $DOCKER_USERNAME/frontend
cd ../food-delivery-system-backend

echo "All images built and pushed successfully!"
