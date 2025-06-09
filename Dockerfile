FROM node:18
WORKDIR /app
COPY . .
RUN apt-get update && apt-get install -y ffmpeg git curl
RUN npm install --prefix kernel-slate
VOLUME ["/input", "/output", "/voice"]
CMD ["make", "boot"]
