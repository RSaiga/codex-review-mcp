FROM node:22

WORKDIR /app

RUN npm install -g @openai/codex

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

RUN useradd -m appuser
USER appuser

CMD ["node", "dist/server.js"]
