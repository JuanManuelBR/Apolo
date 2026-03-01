import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Users API',
      version: '1.0.0',
      description: 'API para gestionar usuarios, autenticación y sesiones',
      contact: {
        name: 'WebExams Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo',
      },
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Autenticación y sesión',
      },
      {
        name: 'Users',
        description: 'Gestión de usuarios',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'JWT de autenticación enviado en cookie HttpOnly',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            nombre: { type: 'string', example: 'Juan Pérez' },
            correoElectronico: { type: 'string', format: 'email', example: 'juan@example.com' },
            rol: { type: 'string', enum: ['teacher', 'admin'], example: 'teacher' },
            firebaseUid: { type: 'string', nullable: true, example: 'firebase-uid-123' },
            createdAt: { type: 'string', format: 'date-time', example: '2026-01-10T08:00:00.000Z' },
            ultimoAcceso: { type: 'string', format: 'date-time', nullable: true, example: '2026-03-01T10:00:00.000Z' },
          },
        },
        RegisterDto: {
          type: 'object',
          required: ['nombre', 'correoElectronico', 'contrasena'],
          properties: {
            nombre: { type: 'string', example: 'Juan Pérez' },
            correoElectronico: { type: 'string', format: 'email', example: 'juan@example.com' },
            contrasena: { type: 'string', minLength: 6, example: 'mypassword123' },
          },
        },
        LoginDto: {
          type: 'object',
          required: ['correoElectronico', 'contrasena'],
          properties: {
            correoElectronico: { type: 'string', format: 'email', example: 'juan@example.com' },
            contrasena: { type: 'string', example: 'mypassword123' },
          },
        },
        LoginGoogleDto: {
          type: 'object',
          required: ['idToken'],
          properties: {
            idToken: { type: 'string', description: 'Token de Google OAuth', example: 'google-id-token-xyz' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Credenciales inválidas' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  app.use('/api/users/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Users API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  }));

  app.get('/api/users/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

};

export default swaggerSpec;
