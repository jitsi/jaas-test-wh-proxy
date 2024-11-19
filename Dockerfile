FROM --platform=$TARGETPLATFORM node:20
ARG TARGETPLATFORM

# install dependencies
RUN apt-get update && apt-get -y install linux-perf

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built app
COPY ./index.js .

# Copy the run script
COPY ./build/run.sh .

# Run app
EXPOSE 18080
ENV NODE_ENV=production
CMD [ "./run.sh" ]
