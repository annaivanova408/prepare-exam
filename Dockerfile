FROM nginx:1.27-alpine

COPY . /usr/share/nginx/html/
COPY web/ /usr/share/nginx/html/

EXPOSE 80
