# Use a lightweight Nginx image
FROM nginx:alpine

# Copy static site content to Nginx's public directory
COPY index.html /usr/share/nginx/html/index.html

# Expose port 80
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
