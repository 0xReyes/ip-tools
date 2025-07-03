# Use the latest Ubuntu image as the base
FROM ubuntu:latest

# Update package list and install traceroute and other tools
RUN apt-get update && apt-get install -y traceroute dnsutils iputils-ping whois && apt-get clean

# Set a default command (optional, can be overridden in workflow)
CMD ["/bin/bash"]