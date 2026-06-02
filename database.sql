-- En PostgreSQL primero crea/selecciona la base de datos desde pgAdmin o DBeaver.
-- Luego ejecuta este script dentro de esa base de datos.

CREATE TABLE usuarios (
  id_usuario SERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  contrasena VARCHAR(255) NOT NULL
);

CREATE TABLE categorias (
  id_categoria SERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  tipo VARCHAR(20) NOT NULL
);

CREATE TABLE transacciones (
  id_transaccion SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_categoria INT NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  fecha DATE NOT NULL,
  descripcion VARCHAR(150),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria)
);

INSERT INTO usuarios (nombre, email, contrasena) VALUES
('Ana López', 'ana@correo.com', 'ana123'),
('Carlos Ruiz', 'carlos@correo.com', 'carlos123'),
('Mariana Soto', 'mariana@correo.com', 'mariana123');

INSERT INTO categorias (nombre, tipo) VALUES
('Comida', 'gasto'),
('Salario', 'ingreso'),
('Transporte', 'gasto');

INSERT INTO transacciones (id_usuario, id_categoria, monto, fecha, descripcion) VALUES
(1, 1, 250.50, '2026-05-01', 'Supermercado'),
(1, 2, 8500.00, '2026-05-03', 'Pago quincenal'),
(2, 3, 120.00, '2026-05-04', 'Gasolina');

SELECT * FROM usuarios;

SELECT
  t.id_transaccion,
  u.nombre AS usuario,
  c.nombre AS categoria,
  c.tipo,
  t.monto,
  t.fecha
FROM transacciones t
JOIN usuarios u ON t.id_usuario = u.id_usuario
JOIN categorias c ON t.id_categoria = c.id_categoria;

SELECT
  u.nombre AS usuario,
  SUM(t.monto) AS total_movimientos
FROM usuarios u
JOIN transacciones t ON u.id_usuario = t.id_usuario
GROUP BY u.id_usuario, u.nombre;
