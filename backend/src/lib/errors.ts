/**
 * Erros de aplicação tipados.
 * O handler global de erros (em server.ts) converte estes em respostas HTTP.
 */

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/** 400 — Requisição malformada */
export class BadRequestError extends AppError {
  constructor(message = 'Requisição inválida') {
    super(400, message, 'BAD_REQUEST')
  }
}

/** 401 — Não autenticado */
export class UnauthorizedError extends AppError {
  constructor(message = 'Não autenticado') {
    super(401, message, 'UNAUTHORIZED')
  }
}

/** 403 — Autenticado mas sem permissão */
export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') {
    super(403, message, 'FORBIDDEN')
  }
}

/** 404 — Recurso não encontrado */
export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(404, message, 'NOT_FOUND')
  }
}

/** 409 — Conflito (ex: e-mail/CPF já cadastrado) */
export class ConflictError extends AppError {
  constructor(message = 'Conflito de dados') {
    super(409, message, 'CONFLICT')
  }
}

/** 422 — Falha de validação de campos */
export class ValidationError extends AppError {
  constructor(message = 'Dados inválidos', public details?: unknown) {
    super(422, message, 'VALIDATION_ERROR')
  }
}
