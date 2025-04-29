## 1. Environment Setup

### 1.1 Clone the Repository


git clone https://github.com/IT22056320/food-delivery-system-backend.git
cd food-delivery-system-backend


### 1.2 Set Up Environment Variables

Create `.env` files for each service:


**Auth Service (.env)**

```
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/auth-service
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRY=7d
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-email-password
FRONTEND_URL=http://your-domain.com
```

**Restaurant Service (.env)**

```
PORT=5001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/restaurant-service
JWT_SECRET=your_jwt_secret_key
FRONTEND_URL=http://your-domain.com
```

**Order Service (.env)**

```
PORT=5002
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/order-service
JWT_SECRET=your_jwt_secret_key
STRIPE_SECRET_KEY=your_stripe_secret_key
FRONTEND_URL=http://your-domain.com
```

**Delivery Service (.env)**

```
PORT=5003
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/delivery-service
JWT_SECRET=your_jwt_secret_key
FRONTEND_URL=http://your-domain.com
```

## 2. Backend Deployment

### 2.1 Authentication Service

```
cd services/auth-service
npm install
npm run dev
```


### 2.2 Restaurant Service

```shellscript
cd services/restaurant-service
npm install
npm run dev
```

### 2.3 Order Service

```shellscript
cd services/order-service
npm install
npm install
npm run dev
```

### 2.4 Delivery Service

```shellscript
cd services/delivery-service
npm install
npm run dev
```
