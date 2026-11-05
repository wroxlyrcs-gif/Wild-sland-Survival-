# Çok oyunculu sunucu için (Render / Fly.io / Railway / VPS). Yapı bağlamı proje kök klasörüdür.
FROM node:20-alpine
WORKDIR /app
COPY shared ./shared
COPY server ./server
WORKDIR /app/server
RUN npm install --omit=dev
ENV PORT=8080 DATA_DIR=/data
VOLUME /data
EXPOSE 8080
CMD ["node","server.js"]
