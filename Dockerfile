FROM node:18
WORKDIR /app
COPY . .
RUN apt-get update && apt-get install -y python3 ffmpeg docker.io || true
RUN npm install --prefix kernel-slate
VOLUME ["/input", "/output", "/voice"]
CMD ["make", "boot"]
