-- ============================================================
--  SEED: Categorías y Ubigeo (distritos de Junín además de HYO)
--  Ejecutar UNA vez en la BD (MySQL). Es idempotente (usa NOT EXISTS),
--  así que volver a correrlo no duplica filas.
-- ============================================================

-- ─────────────────────────────────────────────
--  1) CATEGORÍAS DE PRODUCTO (se reflejan solas
--     en el filtro del catálogo, que ahora es dinámico)
-- ─────────────────────────────────────────────
INSERT INTO categoria_producto (nombre, descripcion, estado)
SELECT 'Vitaminas y Suplementos', 'Vitaminas y suplementos nutricionales para animales', 'ACTIVO'
WHERE NOT EXISTS (SELECT 1 FROM categoria_producto WHERE nombre = 'Vitaminas y Suplementos');

INSERT INTO categoria_producto (nombre, descripcion, estado)
SELECT 'Vacunas', 'Vacunas veterinarias', 'ACTIVO'
WHERE NOT EXISTS (SELECT 1 FROM categoria_producto WHERE nombre = 'Vacunas');

INSERT INTO categoria_producto (nombre, descripcion, estado)
SELECT 'Desparasitantes', 'Antiparasitarios internos y externos', 'ACTIVO'
WHERE NOT EXISTS (SELECT 1 FROM categoria_producto WHERE nombre = 'Desparasitantes');

INSERT INTO categoria_producto (nombre, descripcion, estado)
SELECT 'Higiene y Cuidado', 'Shampoo, jabones y productos de higiene', 'ACTIVO'
WHERE NOT EXISTS (SELECT 1 FROM categoria_producto WHERE nombre = 'Higiene y Cuidado');

INSERT INTO categoria_producto (nombre, descripcion, estado)
SELECT 'Juguetes', 'Juguetes para mascotas', 'ACTIVO'
WHERE NOT EXISTS (SELECT 1 FROM categoria_producto WHERE nombre = 'Juguetes');


-- ─────────────────────────────────────────────
--  2) UBIGEO — Provincias de JUNÍN (además de Huancayo)
--     y algunos distritos con costo de envío.
-- ─────────────────────────────────────────────
SET @dep := (SELECT id_departamento FROM departamento
             WHERE UPPER(nombre) IN ('JUNÍN', 'JUNIN') LIMIT 1);

-- Provincias
INSERT INTO provincia (id_departamento, nombre)
SELECT @dep, 'Concepción'
WHERE @dep IS NOT NULL AND NOT EXISTS (SELECT 1 FROM provincia WHERE nombre='Concepción' AND id_departamento=@dep);

INSERT INTO provincia (id_departamento, nombre)
SELECT @dep, 'Chupaca'
WHERE @dep IS NOT NULL AND NOT EXISTS (SELECT 1 FROM provincia WHERE nombre='Chupaca' AND id_departamento=@dep);

INSERT INTO provincia (id_departamento, nombre)
SELECT @dep, 'Jauja'
WHERE @dep IS NOT NULL AND NOT EXISTS (SELECT 1 FROM provincia WHERE nombre='Jauja' AND id_departamento=@dep);

INSERT INTO provincia (id_departamento, nombre)
SELECT @dep, 'Tarma'
WHERE @dep IS NOT NULL AND NOT EXISTS (SELECT 1 FROM provincia WHERE nombre='Tarma' AND id_departamento=@dep);

-- Distritos (costo_envio en S/.)
-- Concepción
INSERT INTO distrito (id_provincia, nombre, costo_envio)
SELECT (SELECT id_provincia FROM provincia WHERE nombre='Concepción' AND id_departamento=@dep), 'Concepción', 8.00
WHERE NOT EXISTS (SELECT 1 FROM distrito d JOIN provincia p ON d.id_provincia=p.id_provincia
                  WHERE d.nombre='Concepción' AND p.nombre='Concepción' AND p.id_departamento=@dep);
INSERT INTO distrito (id_provincia, nombre, costo_envio)
SELECT (SELECT id_provincia FROM provincia WHERE nombre='Concepción' AND id_departamento=@dep), 'Matahuasi', 9.00
WHERE NOT EXISTS (SELECT 1 FROM distrito d JOIN provincia p ON d.id_provincia=p.id_provincia
                  WHERE d.nombre='Matahuasi' AND p.nombre='Concepción' AND p.id_departamento=@dep);

-- Chupaca
INSERT INTO distrito (id_provincia, nombre, costo_envio)
SELECT (SELECT id_provincia FROM provincia WHERE nombre='Chupaca' AND id_departamento=@dep), 'Chupaca', 7.00
WHERE NOT EXISTS (SELECT 1 FROM distrito d JOIN provincia p ON d.id_provincia=p.id_provincia
                  WHERE d.nombre='Chupaca' AND p.nombre='Chupaca' AND p.id_departamento=@dep);
INSERT INTO distrito (id_provincia, nombre, costo_envio)
SELECT (SELECT id_provincia FROM provincia WHERE nombre='Chupaca' AND id_departamento=@dep), 'Ahuac', 9.00
WHERE NOT EXISTS (SELECT 1 FROM distrito d JOIN provincia p ON d.id_provincia=p.id_provincia
                  WHERE d.nombre='Ahuac' AND p.nombre='Chupaca' AND p.id_departamento=@dep);

-- Jauja
INSERT INTO distrito (id_provincia, nombre, costo_envio)
SELECT (SELECT id_provincia FROM provincia WHERE nombre='Jauja' AND id_departamento=@dep), 'Jauja', 10.00
WHERE NOT EXISTS (SELECT 1 FROM distrito d JOIN provincia p ON d.id_provincia=p.id_provincia
                  WHERE d.nombre='Jauja' AND p.nombre='Jauja' AND p.id_departamento=@dep);
INSERT INTO distrito (id_provincia, nombre, costo_envio)
SELECT (SELECT id_provincia FROM provincia WHERE nombre='Jauja' AND id_departamento=@dep), 'Yauyos', 10.00
WHERE NOT EXISTS (SELECT 1 FROM distrito d JOIN provincia p ON d.id_provincia=p.id_provincia
                  WHERE d.nombre='Yauyos' AND p.nombre='Jauja' AND p.id_departamento=@dep);

-- Tarma
INSERT INTO distrito (id_provincia, nombre, costo_envio)
SELECT (SELECT id_provincia FROM provincia WHERE nombre='Tarma' AND id_departamento=@dep), 'Tarma', 12.00
WHERE NOT EXISTS (SELECT 1 FROM distrito d JOIN provincia p ON d.id_provincia=p.id_provincia
                  WHERE d.nombre='Tarma' AND p.nombre='Tarma' AND p.id_departamento=@dep);
INSERT INTO distrito (id_provincia, nombre, costo_envio)
SELECT (SELECT id_provincia FROM provincia WHERE nombre='Tarma' AND id_departamento=@dep), 'Acobamba', 12.00
WHERE NOT EXISTS (SELECT 1 FROM distrito d JOIN provincia p ON d.id_provincia=p.id_provincia
                  WHERE d.nombre='Acobamba' AND p.nombre='Tarma' AND p.id_departamento=@dep);
