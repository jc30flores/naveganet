-- Crear tabla django_session si no existe
CREATE TABLE IF NOT EXISTS django_session (
    session_key VARCHAR(40) NOT NULL PRIMARY KEY,
    session_data TEXT NOT NULL,
    expire_date TIMESTAMPTZ NOT NULL
);

-- Crear índice si no existe
CREATE INDEX IF NOT EXISTS django_session_expire_date_a5c62663 
ON django_session (expire_date);

