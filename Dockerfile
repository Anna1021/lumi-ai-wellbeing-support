FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY . .
ENV NODE_ENV=production PORT=7860
EXPOSE 7860
CMD ["npm", "run", "start"]
