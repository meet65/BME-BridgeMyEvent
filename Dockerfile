# Build Stage
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copy pom.xml and download dependencies
COPY bridgemyevent/pom.xml ./bridgemyevent/
WORKDIR /app/bridgemyevent
RUN mvn dependency:go-offline

# Copy source code and build package
WORKDIR /app
COPY bridgemyevent/src ./bridgemyevent/src
WORKDIR /app/bridgemyevent
RUN mvn clean package -DskipTests

# Run Stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy the built jar to runtime container
COPY --from=build /app/bridgemyevent/target/*.jar app.jar

# Expose port and run application
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
