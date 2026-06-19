-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: mysql-alivetagroveterinaria.alwaysdata.net
-- Generation Time: Jun 19, 2026 at 05:49 PM
-- Server version: 11.4.12-MariaDB
-- PHP Version: 8.4.21

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `alivetagroveterinaria_empresa`
--

-- --------------------------------------------------------

--
-- Table structure for table `cargo`
--

CREATE TABLE `cargo` (
  `id_cargo` int(11) NOT NULL,
  `nombre` varchar(50) DEFAULT NULL,
  `descripcion` varchar(150) DEFAULT NULL,
  `estado` enum('ACTIVO','INACTIVO') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cargo`
--

INSERT INTO `cargo` (`id_cargo`, `nombre`, `descripcion`, `estado`) VALUES
(1, 'Asistente de ventas', 'Apoyo en atención al cliente', 'ACTIVO'),
(2, 'Administrador', 'Encargado del sistema', 'ACTIVO'),
(3, 'Vendedor', 'Encargado de ventas', 'ACTIVO'),
(4, 'Gerente', 'Encargado general del negocio', 'ACTIVO');

-- --------------------------------------------------------

--
-- Table structure for table `categoria_producto`
--

CREATE TABLE `categoria_producto` (
  `id_categoria` int(11) NOT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `descripcion` varchar(200) DEFAULT NULL,
  `estado` enum('ACTIVO','INACTIVO') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categoria_producto`
--

INSERT INTO `categoria_producto` (`id_categoria`, `nombre`, `descripcion`, `estado`) VALUES
(1, 'Alimentos', 'Productos alimenticios para mascotas', 'ACTIVO'),
(2, 'Medicamentos', 'Productos veterinarios', 'ACTIVO'),
(3, 'Accesorios', 'Accesorios para mascotas', 'ACTIVO');

-- --------------------------------------------------------

--
-- Table structure for table `chat_ia`
--

CREATE TABLE `chat_ia` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `rol` varchar(20) NOT NULL DEFAULT 'INVITADO',
  `mensaje_usuario` text NOT NULL,
  `respuesta_ia` text NOT NULL,
  `creado_en` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cliente`
--

CREATE TABLE `cliente` (
  `id_cliente` int(11) NOT NULL,
  `id_persona` int(11) DEFAULT NULL,
  `id_tipo_documento` int(11) DEFAULT NULL,
  `numero_documento` varchar(20) DEFAULT NULL,
  `fecha_registro` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `direccion_habitual` varchar(255) DEFAULT NULL,
  `referencia_habitual` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cliente`
--

INSERT INTO `cliente` (`id_cliente`, `id_persona`, `id_tipo_documento`, `numero_documento`, `fecha_registro`, `direccion_habitual`, `referencia_habitual`) VALUES
(1, 1, 1, '12345678', '2026-02-23 23:23:47', NULL, NULL),
(2, 2, 2, '20123456789', '2026-02-23 23:23:47', NULL, NULL),
(3, 4, 1, '87654321', '2026-02-23 23:23:59', NULL, NULL),
(4, 5, 1, '73995336', '2026-03-03 23:07:17', NULL, NULL),
(5, 6, 1, '73995336', '2026-03-05 16:12:23', NULL, NULL),
(6, 8, 1, '76454344', '2026-03-20 18:50:44', NULL, NULL),
(7, 11, 1, '74354542', '2026-03-21 01:38:11', NULL, NULL),
(8, 12, 1, '67874885', '2026-04-02 02:21:23', NULL, NULL),
(9, 13, 1, '67246237', '2026-04-05 02:58:05', NULL, NULL),
(10, 14, 1, '61561624', '2026-04-09 21:19:28', 'ejhdbeh', 'hbdjb'),
(11, 15, 2, '98189234798', '2026-04-10 03:51:13', 'hfjdhdhg', 'fbjdj'),
(12, 16, 1, '77133457', '2026-05-14 22:53:00', 'Los héroes', NULL),
(13, 17, 1, '74385648', '2026-05-14 23:45:33', 'jr la mar 160 primera cuadra', 'casa de 100 pisos'),
(14, 18, 1, '26252234', '2026-05-26 00:31:34', 'Jr ayacucho', 'Casa color verde'),
(15, 19, 1, '73995336', '2026-05-27 21:18:02', 'meseta 140', 'ttttttttttttt'),
(16, 20, 1, '11111111', '2026-05-28 01:37:26', 'jbkyf', 'fyukfu'),
(17, 22, 1, '73995336', '2026-06-03 20:04:49', 'meseta 140', 'rbb'),
(18, 23, 1, '73756395', '2026-06-04 01:34:12', 'meseta 140', 'rtwhrth'),
(19, 24, 1, '75453322', '2026-06-10 21:10:54', 'meseta 140', 'tyfgf'),
(20, 25, 1, '12345678', '2026-06-10 22:29:10', NULL, NULL),
(21, 26, 1, '12345671', '2026-06-10 23:22:28', NULL, NULL),
(22, 27, 1, '70123046', '2026-06-10 23:24:06', NULL, NULL),
(23, 28, 1, '74385645', '2026-06-10 23:33:04', NULL, NULL),
(24, 29, 1, '73995325', '2026-06-10 23:36:00', NULL, NULL),
(25, 30, 1, '73462364', '2026-06-11 01:28:28', NULL, NULL),
(26, 31, 1, '76649452', '2026-06-17 00:00:52', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `colaborador`
--

CREATE TABLE `colaborador` (
  `id_colaborador` int(11) NOT NULL,
  `id_persona` int(11) DEFAULT NULL,
  `dni` varchar(20) DEFAULT NULL,
  `id_cargo` int(11) DEFAULT NULL,
  `usuario` varchar(50) DEFAULT NULL,
  `estado` enum('ACTIVO','INACTIVO') DEFAULT NULL,
  `fcm_token` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `colaborador`
--

INSERT INTO `colaborador` (`id_colaborador`, `id_persona`, `dni`, `id_cargo`, `usuario`, `estado`, `fcm_token`) VALUES
(1, 3, '44556677', 2, 'admin', 'INACTIVO', NULL),
(2, 7, '68870964', 1, 'asistente ventas', 'ACTIVO', NULL),
(4, 10, '76649645', 3, 'rebeca', 'ACTIVO', NULL),
(5, 21, '78265422', 1, 'merly', 'ACTIVO', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `comprobante`
--

CREATE TABLE `comprobante` (
  `id_comprobante` int(11) NOT NULL,
  `id_pedido` int(11) DEFAULT NULL,
  `serie` varchar(10) DEFAULT NULL,
  `numero` varchar(20) DEFAULT NULL,
  `fecha_emision` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `archivo_pdf` varchar(255) DEFAULT NULL,
  `tipo` varchar(20) DEFAULT 'BOLETA',
  `ruc_cliente` varchar(11) DEFAULT NULL,
  `razon_social` varchar(200) DEFAULT NULL,
  `direccion_fiscal` varchar(200) DEFAULT NULL,
  `dni_cliente` varchar(8) DEFAULT NULL,
  `nombre_cliente` varchar(200) DEFAULT NULL,
  `subtotal` decimal(10,2) DEFAULT NULL,
  `igv` decimal(10,2) DEFAULT NULL,
  `total` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `comprobante`
--

INSERT INTO `comprobante` (`id_comprobante`, `id_pedido`, `serie`, `numero`, `fecha_emision`, `archivo_pdf`, `tipo`, `ruc_cliente`, `razon_social`, `direccion_fiscal`, `dni_cliente`, `nombre_cliente`, `subtotal`, `igv`, `total`) VALUES
(1, 1, 'B001', '000123', '2026-02-23 23:23:48', 'comprobante1.pdf', 'BOLETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 2, 'B001', '000002', '2026-03-04 00:25:14', NULL, 'BOLETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(3, 3, 'B001', '000003', '2026-03-04 01:23:38', NULL, 'BOLETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(4, 4, 'B001', '000004', '2026-03-20 18:52:23', NULL, 'BOLETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(5, 5, 'B001', '000005', '2026-03-21 01:39:22', NULL, 'BOLETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(6, 6, 'B001', '000006', '2026-04-02 04:27:48', NULL, 'BOLETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(7, 7, 'B001', '000007', '2026-04-09 19:58:50', NULL, 'BOLETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(8, 8, 'B001', '000008', '2026-04-09 20:49:15', NULL, 'BOLETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(9, 9, 'B001', '000009', '2026-04-09 21:19:58', NULL, 'BOLETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(10, 10, 'F001', '000010', '2026-04-10 03:53:53', NULL, 'BOLETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(11, 11, 'B001', '000011', '2026-05-14 22:54:51', NULL, 'BOLETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(12, 12, 'B001', '000012', '2026-05-14 23:45:49', NULL, 'BOLETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(13, 13, 'B001', '000013', '2026-05-27 21:18:13', NULL, 'BOLETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(14, 14, 'B001', '000014', '2026-05-27 21:23:14', NULL, 'BOLETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(15, 15, 'B001', '000015', '2026-05-28 01:37:43', NULL, 'BOLETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(16, 16, 'B001', '000016', '2026-06-03 20:05:10', NULL, 'BOLETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(17, 17, 'B001', '000017', '2026-06-04 01:34:21', NULL, 'BOLETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(18, 18, 'B001', '000018', '2026-06-10 21:11:29', NULL, 'BOLETA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `departamento`
--

CREATE TABLE `departamento` (
  `id_departamento` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

--
-- Dumping data for table `departamento`
--

INSERT INTO `departamento` (`id_departamento`, `nombre`) VALUES
(1, 'Junín');

-- --------------------------------------------------------

--
-- Table structure for table `detalle_pedido`
--

CREATE TABLE `detalle_pedido` (
  `id_detalle` int(11) NOT NULL,
  `id_pedido` int(11) DEFAULT NULL,
  `id_producto` int(11) DEFAULT NULL,
  `cantidad` int(11) DEFAULT NULL,
  `precio_unitario` decimal(10,2) DEFAULT NULL,
  `subtotal` decimal(10,2) DEFAULT NULL,
  `color` varchar(100) DEFAULT NULL,
  `talla` varchar(100) DEFAULT NULL,
  `marca` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `detalle_pedido`
--

INSERT INTO `detalle_pedido` (`id_detalle`, `id_pedido`, `id_producto`, `cantidad`, `precio_unitario`, `subtotal`, `color`, `talla`, `marca`) VALUES
(1, 1, 1, 1, 120.00, 120.00, NULL, NULL, NULL),
(2, 1, 2, 1, 35.00, 35.00, NULL, NULL, NULL),
(3, 2, 2, 2, 35.00, 70.00, NULL, NULL, NULL),
(4, 2, 1, 4, 120.00, 480.00, NULL, NULL, NULL),
(5, 3, 1, 1, 120.00, 120.00, NULL, NULL, NULL),
(6, 3, 3, 3, 20.00, 60.00, NULL, NULL, NULL),
(7, 4, 5, 2, 15.00, 30.00, NULL, NULL, NULL),
(8, 5, 7, 1, 38.00, 38.00, NULL, NULL, NULL),
(9, 6, 5, 6, 15.00, 90.00, NULL, NULL, NULL),
(10, 7, 31, 1, 200.00, 200.00, NULL, NULL, NULL),
(11, 8, 31, 2, 200.00, 400.00, 'verde', 'M', NULL),
(12, 9, 30, 1, 40000.00, 40000.00, NULL, NULL, NULL),
(13, 10, 24, 1, 200.00, 200.00, NULL, NULL, NULL),
(14, 11, 1, 2, 120.00, 240.00, NULL, NULL, NULL),
(15, 11, 24, 1, 200.00, 200.00, NULL, NULL, NULL),
(16, 12, 1, 16, 120.00, 1920.00, NULL, NULL, NULL),
(17, 12, 24, 25, 200.00, 5000.00, NULL, NULL, NULL),
(18, 12, 30, 26, 40000.00, 1040000.00, NULL, NULL, NULL),
(19, 12, 31, 14, 200.00, 2800.00, NULL, NULL, NULL),
(20, 12, 3, 11, 20.00, 220.00, NULL, NULL, NULL),
(21, 12, 28, 38, 50.00, 1900.00, NULL, NULL, NULL),
(22, 12, 29, 17, 1000.00, 17000.00, NULL, NULL, NULL),
(23, 12, 2, 9, 35.00, 315.00, NULL, NULL, NULL),
(24, 13, 3, 1, 20.00, 20.00, NULL, NULL, NULL),
(25, 13, 28, 1, 50.00, 50.00, NULL, NULL, NULL),
(26, 14, 28, 1, 50.00, 50.00, NULL, NULL, NULL),
(27, 14, 2, 8, 35.00, 280.00, NULL, NULL, NULL),
(28, 14, 3, 1, 20.00, 20.00, NULL, NULL, NULL),
(29, 15, 28, 1, 50.00, 50.00, NULL, NULL, NULL),
(30, 15, 29, 1, 1000.00, 1000.00, NULL, NULL, NULL),
(31, 16, 28, 1, 50.00, 50.00, NULL, NULL, NULL),
(32, 17, 29, 1, 1000.00, 1000.00, NULL, NULL, NULL),
(33, 18, 45, 1, 13.00, 13.00, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `distrito`
--

CREATE TABLE `distrito` (
  `id_distrito` int(11) NOT NULL,
  `id_provincia` int(11) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `costo_envio` decimal(10,2) DEFAULT 5.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

--
-- Dumping data for table `distrito`
--

INSERT INTO `distrito` (`id_distrito`, `id_provincia`, `nombre`, `costo_envio`) VALUES
(1, 1, 'Huancayo', 5.00),
(2, 1, 'Chilca', 5.00),
(3, 1, 'El Tambo', 5.00),
(4, 1, 'Huancan', 7.00),
(5, 1, 'Sapallanga', 7.00),
(6, 1, 'Pilcomayo', 6.00),
(7, 1, 'Chilca', 5.00),
(8, 1, 'Chupaca', 8.00),
(9, 1, 'Sicaya', 8.00),
(10, 1, 'San Agustín', 8.00),
(11, 1, 'Quilcas', 10.00),
(12, 1, 'Viques', 10.00),
(13, 1, 'Pucará', 12.00),
(14, 1, 'Orcotuna', 9.00),
(15, 1, 'San Jerónimo', 8.00);

-- --------------------------------------------------------

--
-- Table structure for table `fcm_tokens`
--

CREATE TABLE `fcm_tokens` (
  `id` int(11) NOT NULL,
  `token` text NOT NULL,
  `activo` tinyint(4) DEFAULT 1,
  `creado_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;

--
-- Dumping data for table `fcm_tokens`
--

INSERT INTO `fcm_tokens` (`id`, `token`, `activo`, `creado_at`, `actualizado_at`) VALUES
(1, 'fUIYQPf4vr3-v3TzJ3QtrA:APA91bFXBnsxKq5VXz5Zo1IcJsL6U0VSWD8iTb6GjLZxMIRqGGyMSvPAmPRceczBZtBiWqj9PKa0IBA77yiL9AsJDQmId1F360opvZz_EO3ipZKlKm8CYqQ', 1, '2026-04-02 02:18:45', '2026-04-10 12:51:18'),
(40, 'cuP5s-yn0JhAyJcN5P_YIk:APA91bGiGphVK4zK8LM4JB-5dtSwjjVT2t9r2xEKK8N_0RZKEv7Qsi_urPSQjVILcS79HA4vpTQ4hrEXBS7-h9pNlyFsQFcNiBNEhFEJWhtn5drOzczlrk8', 1, '2026-05-14 22:47:30', '2026-05-14 22:54:05'),
(42, 'eJ8zTIFQNJeksi6xUaZpfj:APA91bENYSwHTT4Jl5XhJXv2652HTQr6M8l3zOLwq14qPeUOGnTB6F0WIRUIKwth7mApRI4oWyrEMWD2nqrLNFZTnK1c2iHL5RI5Qc6z2if0awE-93zNJC0', 1, '2026-05-21 02:01:14', '2026-05-21 02:01:14'),
(43, 'euZKWQSi3Atx1OjwRk0Hek:APA91bGkVFBXW0HVR5X-jLgoXojByelF5rQXDZ_F6MBIvXV0EMkY0M34thceV67Hf7JLUybcAMogpiRDXqKrW-mELIKAL19yAq21zlVjfh-EkdK_rB32XkM', 1, '2026-05-27 00:05:08', '2026-05-27 00:05:08'),
(44, 'csRwPflr2k_nDi2LCgy61i:APA91bGGCe2wg1euDLJh3DRMgQXrf1sTqsQjwL3ixpsJTzF69ztGJNn_yQPLl9VkK0cQNcxaf8PCvBBI8Ik_7w2AN-vFVt9_eK159ep5w5avzPr6hiMEYY0', 1, '2026-05-27 00:12:38', '2026-05-27 00:12:38'),
(45, 'en5gV62U8FmKvycRmQuCRn:APA91bFnYJHzVb2yfMH2DGLp8XAThuzCAIuN_a0y_qNtXWR0zRQV9jB27dGrfjhLxSxFJ8CBx_qbPNviY5jQBkhkcwiEx_Q1_bW_oXJvGbEdSkF7zwaTR2Y', 1, '2026-05-27 21:16:06', '2026-06-03 17:46:28'),
(46, 'cLdvnREQIvcf52hwm-6GeI:APA91bELiE5qol4wnEupGlN_nqizwRD7bcgT5uMpyIS7ke3pgFpZDpNNXVgJVZs6no6pSJpNeiCm--52GRzcHXrAc4dOPuef0oZ66svA6sVe8FFLQmOJdls', 1, '2026-05-27 23:03:04', '2026-05-27 23:03:04'),
(47, 'dXkdANx7bxNCFleJ4i-UaY:APA91bET5G7pcdsgw2B90xER_Z0fLIRsu7o2TmxJUo1ie5zKHAOv68o689Uy8xTqjhzbMqB4PVRanNyuMbnqBrKvCWd80S3mTPdXCOLm7VmsIH0mEdlXyvg', 1, '2026-06-02 22:17:26', '2026-06-02 22:17:26'),
(48, 'dpHT6guxB3y8VC7j0UgxXc:APA91bGAfzgHzH2bI5LnXMDkG8GiieJpgerBYATKQUVnx0PGENnGQV1IJicCbRcDWyUTulpIPovXLOEwcRHP0BV_jrU7OxahKRgBonsk1nW9PhW8KfeIjYM', 1, '2026-06-03 00:23:27', '2026-06-03 00:23:27'),
(52, 'cLIYHItvK2iUu1c0d9aY2-:APA91bHK_-K32JspPlJJOlplAUEuMer9-NVHGxKITDWPuWSENShVF7Z2AOKK5YAAlX9qCNFO20FG3qsBryxXekvQ0wYSkzdLRL9pqMYIW1xiz327gTSv9_U', 1, '2026-06-03 20:07:55', '2026-06-03 21:01:28'),
(59, 'czBTp4-Nl9iRZ3e7FLx4rK:APA91bEyhRN0tz77D9cXrtyFGMXWlysrAAVDYnG6bzkpjKfAtwL2wyAdmSuqmp1n8ztBrFfPqyuIK3EevsPJqRmP1wHXjB6r5x-Sosy2WUuAf9H4gWQdZ1k', 1, '2026-06-04 01:13:38', '2026-06-04 01:44:41'),
(68, 'dAwIGhC9lN_dXrGV6y417k:APA91bEViLtKRUbOQVMEsZAyZzlGyGGakHn3RPSWe-1ZZDWRJ_sg1SreHl7TRya0zu53OLtNFu1N14uOVdW93bXkyhOZAWKrsoTulrr0qJOCdxQTqZYk88w', 1, '2026-06-10 20:57:48', '2026-06-10 20:57:48'),
(69, 'c_mL9BvfYKcqumdT5wQKkK:APA91bGpARMnbZuT7cK-HQrTNEY9lAhaWqLzWQPp7ezXuxdSeed-0l0VpHF-eFIxpzhSkolkTY1Als4aunqbK1zzBR00VZccLEm2jKhkJ5QY54y8NyCO1Kg', 1, '2026-06-11 01:30:16', '2026-06-11 01:47:49'),
(72, 'eKAZTSFGYjgXcNy4MZsSxk:APA91bF1OxKoxlsLHi4Qrw_0ZE9bw98LuFGweEJ8_hfE5aS8VDWe4opdznhlv38EVpY7yzmB2B9U5ATubDEoGrY3DNC5vFMCEooRPnQkfEpKPYPG-aCiRWo', 1, '2026-06-11 23:41:38', '2026-06-11 23:41:38'),
(73, 'cso6xRHdqmUOfoY3vwdjLO:APA91bFbU4KBcLwwawaemcKH9cTX0sj4DYO_MNut5uMEWkr6tkptQbS-dkFTHf6PFATJLvBmL8r37b35pdpMM4krW-d-41yIXKnw46IPqWO8VdhvUwv4IJo', 1, '2026-06-17 00:14:35', '2026-06-17 00:17:28'),
(75, 'dchNtqly2INTIRCP1NmuED:APA91bHUuTYM7GBXPEWlkQKw3JNjhEoSFW2h-xW1MejJse7dUKsnglF_UIa0JkVxtm9WeLkQtF4_xIOPLfINxKWQ5-6mdnrdcY9vJdqEQyAiwLc-4oKeQ1U', 1, '2026-06-18 02:36:13', '2026-06-18 02:36:13'),
(76, 'fq_6pAFNLnJ8-KTSCoM7Pa:APA91bFsrJzx6088nVKnSF9e09ZPAFzFRtjrPvbh-3RCldfR2hsSra0VGl14MYPM2A8kGyt-MKh4DjwsSrVZXMtIHICYemmHWdSszUSMI7E4GL4p_biCx70', 1, '2026-06-19 15:43:46', '2026-06-19 15:43:46');

-- --------------------------------------------------------

--
-- Table structure for table `imagen_producto`
--

CREATE TABLE `imagen_producto` (
  `id_imagen` int(11) NOT NULL,
  `id_producto` int(11) DEFAULT NULL,
  `url_imagen` varchar(255) DEFAULT NULL,
  `es_principal` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notificaciones`
--

CREATE TABLE `notificaciones` (
  `id` int(11) NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `cuerpo` text DEFAULT NULL,
  `tipo` varchar(50) DEFAULT 'general',
  `leida` tinyint(4) DEFAULT 0,
  `creado_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish_ci;

--
-- Dumping data for table `notificaciones`
--

INSERT INTO `notificaciones` (`id`, `titulo`, `cuerpo`, `tipo`, `leida`, `creado_at`) VALUES
(1, '? Nuevo pedido recibido', 'Pedido #6 de MERLY SOLEDAD por S/. 95.00', 'nuevo_pedido', 0, '2026-04-02 04:27:49'),
(2, '? Nuevo pedido recibido', 'Pedido #7 de MERLY SOLEDAD por S/. 207.00', 'nuevo_pedido', 0, '2026-04-09 19:58:51'),
(3, '? Nuevo pedido recibido', 'Pedido #8 de MERLY SOLEDAD por S/. 410.00', 'nuevo_pedido', 0, '2026-04-09 20:49:16'),
(4, '? Nuevo pedido recibido', 'Pedido #9 de LISBETH DIANA CASTRO por S/. 40005.00', 'nuevo_pedido', 0, '2026-04-09 21:19:58'),
(5, '? Nuevo pedido recibido', 'Pedido #10 de CARMEN REYES por S/. 205.00', 'nuevo_pedido', 0, '2026-04-10 03:53:54'),
(6, '? Nuevo pedido recibido', 'Pedido #11 de Wilder por S/. 445.00', 'nuevo_pedido', 0, '2026-05-14 22:54:51'),
(7, '? Nuevo pedido recibido', 'Pedido #12 de WILLIAM por S/. 1069160.00', 'nuevo_pedido', 0, '2026-05-14 23:45:50'),
(8, '? Nuevo pedido recibido', 'Pedido #13 de MERLY SOLEDAD por S/. 75.00', 'nuevo_pedido', 0, '2026-05-27 21:18:13'),
(9, '? Nuevo pedido recibido', 'Pedido #14 de MERLY SOLEDAD por S/. 355.00', 'nuevo_pedido', 0, '2026-05-27 21:23:15'),
(10, '? Nuevo pedido recibido', 'Pedido #15 de aaaaa por S/. 1055.00', 'nuevo_pedido', 0, '2026-05-28 01:37:44'),
(11, '? Nuevo pedido recibido', 'Pedido #16 de MERLY SOLEDAD por S/. 55.00', 'nuevo_pedido', 0, '2026-06-03 20:05:10'),
(12, '? Nuevo pedido recibido', 'Pedido #17 de miriam por S/. 1005.00', 'nuevo_pedido', 0, '2026-06-04 01:34:22'),
(13, '? Nuevo pedido recibido', 'Pedido #18 de MANUEL ALEXANDER por S/. 21.00', 'nuevo_pedido', 0, '2026-06-10 21:11:29'),
(14, '⚠️ Productos con bajo stock', 'Hay 2 producto(s) con stock bajo.', 'bajo_stock', 0, '2026-06-19 08:00:00'),
(15, '? Productos próximos a vencer', 'Hay 2 producto(s) que vencen en 30 días.', 'por_vencer', 0, '2026-06-19 08:00:01');

-- --------------------------------------------------------

--
-- Table structure for table `pago`
--

CREATE TABLE `pago` (
  `id_pago` int(11) NOT NULL,
  `id_pedido` int(11) DEFAULT NULL,
  `id_tipo_pago` int(11) DEFAULT NULL,
  `fecha_pago` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `monto` decimal(10,2) DEFAULT NULL,
  `estado` enum('PENDIENTE','COMPLETADO','RECHAZADO') DEFAULT NULL,
  `codigo_transaccion` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pago`
--

INSERT INTO `pago` (`id_pago`, `id_pedido`, `id_tipo_pago`, `fecha_pago`, `monto`, `estado`, `codigo_transaccion`) VALUES
(1, 1, 1, '2026-02-23 23:23:48', 155.00, 'COMPLETADO', 'TXN123456'),
(2, 2, 1, '2026-03-04 00:25:14', 555.00, 'COMPLETADO', '123456789'),
(3, 3, 1, '2026-03-04 01:23:38', 185.00, 'COMPLETADO', '12345678798090'),
(4, 4, 1, '2026-03-20 18:52:23', 35.00, 'COMPLETADO', '234546723'),
(5, 5, 1, '2026-03-21 01:39:22', 43.00, 'COMPLETADO', '098656343'),
(6, 6, 1, '2026-04-02 04:27:48', 95.00, 'COMPLETADO', '53264324798498'),
(7, 7, 1, '2026-04-09 19:58:50', 207.00, 'COMPLETADO', '954 800 966'),
(8, 8, 1, '2026-04-09 20:49:15', 410.00, 'COMPLETADO', '954 800 966'),
(9, 9, 1, '2026-04-09 21:19:58', 40005.00, 'COMPLETADO', '954 800 966'),
(10, 10, 2, '2026-04-10 03:53:53', 205.00, 'COMPLETADO', 'TARJ-1775793233903'),
(11, 11, 1, '2026-05-14 22:54:50', 445.00, 'COMPLETADO', '921392945'),
(12, 12, 1, '2026-05-14 23:45:49', 1069160.00, 'COMPLETADO', '746'),
(13, 13, 1, '2026-05-27 21:18:13', 75.00, 'COMPLETADO', '231'),
(14, 14, 1, '2026-05-27 21:23:14', 355.00, 'COMPLETADO', '333'),
(15, 15, 1, '2026-05-28 01:37:43', 1055.00, 'COMPLETADO', '231'),
(16, 16, 1, '2026-06-03 20:05:09', 55.00, 'COMPLETADO', '231123'),
(17, 17, 1, '2026-06-04 01:34:21', 1005.00, 'COMPLETADO', '231123'),
(18, 18, 1, '2026-06-10 21:11:28', 21.00, 'COMPLETADO', '231123');

-- --------------------------------------------------------

--
-- Table structure for table `pedido`
--

CREATE TABLE `pedido` (
  `id_pedido` int(11) NOT NULL,
  `id_cliente` int(11) DEFAULT NULL,
  `id_zona` int(11) DEFAULT NULL,
  `id_tipo_comprobante` int(11) DEFAULT NULL,
  `fecha_pedido` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `total` decimal(10,2) DEFAULT NULL,
  `costo_envio` decimal(10,2) DEFAULT NULL,
  `direccion_entrega` varchar(200) DEFAULT NULL,
  `estado` enum('PENDIENTE','PAGADO','ENVIADO','ENTREGADO','CANCELADO') DEFAULT NULL,
  `id_distrito` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pedido`
--

INSERT INTO `pedido` (`id_pedido`, `id_cliente`, `id_zona`, `id_tipo_comprobante`, `fecha_pedido`, `total`, `costo_envio`, `direccion_entrega`, `estado`, `id_distrito`) VALUES
(1, 1, 1, 1, '2026-06-12 20:10:13', 155.00, 5.00, 'Av. Lima 123', 'ENTREGADO', NULL),
(2, 1, 1, 1, '2026-03-20 18:46:56', 555.00, 5.00, 'cerrito N°140 pasaje mesetas huancayo', 'ENTREGADO', NULL),
(3, 1, 1, 1, '2026-03-20 18:45:45', 185.00, 5.00, 'cerrito N°140 pasaje mesetas huancayo', 'ENTREGADO', NULL),
(4, 6, NULL, 1, '2026-03-20 18:55:34', 35.00, 5.00, 'meseta 140', 'ENTREGADO', NULL),
(5, 7, NULL, 1, '2026-03-21 01:40:11', 43.00, 5.00, 'ysdgfhe', 'ENTREGADO', NULL),
(6, 8, NULL, 1, '2026-04-02 04:31:46', 95.00, 5.00, 'dbjvd', 'ENTREGADO', NULL),
(7, 8, NULL, 1, '2026-04-09 19:58:50', 207.00, 7.00, 'fhgjh', 'PENDIENTE', NULL),
(8, 8, NULL, 1, '2026-04-09 20:49:15', 410.00, 10.00, 'serrito', 'PENDIENTE', NULL),
(9, 10, NULL, 1, '2026-04-09 21:19:58', 40005.00, 5.00, 'ejhdbeh', 'PENDIENTE', NULL),
(10, 11, NULL, 2, '2026-04-10 03:53:53', 205.00, 5.00, 'hfjdhdhg', 'PENDIENTE', NULL),
(11, 12, NULL, 1, '2026-05-21 01:31:26', 445.00, 5.00, 'Los héroes', 'ENTREGADO', 8),
(12, 13, NULL, 1, '2026-05-14 23:45:49', 1069160.00, 5.00, 'jr la mar 160 primera cuadra', 'PAGADO', 1),
(13, 15, NULL, 1, '2026-05-27 21:18:13', 75.00, 5.00, 'meseta 140', 'PAGADO', 3),
(14, 15, NULL, 1, '2026-05-27 21:23:14', 355.00, 5.00, 'meseta 140', 'PAGADO', 13),
(15, 16, NULL, 1, '2026-05-28 01:37:43', 1055.00, 5.00, 'jbkyf', 'PAGADO', 8),
(16, 17, NULL, 1, '2026-06-03 20:06:00', 55.00, 5.00, 'meseta 140', 'ENTREGADO', 8),
(17, 18, NULL, 1, '2026-06-04 01:44:06', 1005.00, 5.00, 'meseta 140', 'ENTREGADO', 7),
(18, 19, NULL, 1, '2026-06-10 21:11:29', 21.00, 8.00, 'meseta 140', 'PAGADO', 2);

-- --------------------------------------------------------

--
-- Table structure for table `persona`
--

CREATE TABLE `persona` (
  `id_persona` int(11) NOT NULL,
  `nombres` varchar(100) DEFAULT NULL,
  `apellido_paterno` varchar(100) DEFAULT NULL,
  `apellido_materno` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `correo` varchar(150) DEFAULT NULL,
  `direccion` varchar(200) DEFAULT NULL,
  `estado` enum('ACTIVO','INACTIVO') DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `password` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `persona`
--

INSERT INTO `persona` (`id_persona`, `nombres`, `apellido_paterno`, `apellido_materno`, `telefono`, `correo`, `direccion`, `estado`, `fecha_creacion`, `password`) VALUES
(1, 'Juan', 'Perez', 'Lopez', '987654321', 'juan@gmail.com', 'Av. Lima 123', 'ACTIVO', '2026-03-03 23:24:02', '$2b$10$j9xGyemEQo1C2wKKq.KvA.dTFkonEsNdn4/Ejm6oT0/j1dq97awfq'),
(2, 'Maria', 'Gomez', 'Torres', '912345678', 'maria@gmail.com', 'Av. Arequipa 456', 'ACTIVO', '2026-03-03 23:24:02', '$2b$10$j9xGyemEQo1C2wKKq.KvA.dTFkonEsNdn4/Ejm6oT0/j1dq97awfq'),
(3, 'Carlos', 'Ramirez', 'Diaz', '998877665', 'carlos@gmail.com', 'Av. Peru 789', 'ACTIVO', '2026-03-03 23:24:02', '$2b$10$j9xGyemEQo1C2wKKq.KvA.dTFkonEsNdn4/Ejm6oT0/j1dq97awfq'),
(4, 'Merly Soledad', 'Castro', 'Galvez', '999888777', 'merly@gmail.com', 'Av. Primavera 321', 'ACTIVO', '2026-03-03 23:24:02', '$2b$10$j9xGyemEQo1C2wKKq.KvA.dTFkonEsNdn4/Ejm6oT0/j1dq97awfq'),
(5, 'Merly Diana ', 'castro', 'galvez', NULL, 'Dmerly@gmail.com', NULL, 'ACTIVO', '2026-03-03 23:17:43', '$2b$10$8Xj9NZUQfq2t2yjBO6/qruOs.yuGb6Btq.Ycuub/9UzHv0SGaIq4O'),
(6, 'Soledad', 'Perez', 'Huaman', '925920419', 'Sperez@gmail.com', NULL, 'ACTIVO', '2026-03-05 16:55:14', '$2b$10$cdhpUWpM/dwHNBwKVt8mueI36ITFJ7u8DfWHN0yOj2/wGgHO7GvUK'),
(7, 'FREDY', 'QUISPE ', 'CASTRO', '987654123', 'FQUISPE@gmail.com', NULL, 'ACTIVO', '2026-03-19 21:25:35', '$2b$10$xcpQOo4UgqtUnuipjH4GP..1gzo4iA85zx.J3AUvTcgpMG4UjIVeW'),
(8, 'CORA ALEJANDRA', 'MEDINA', 'SOTO', NULL, 'cmedinasoto@gmail.com', NULL, 'ACTIVO', '2026-03-20 18:50:44', '$2b$10$aau8qkwie.j9xgghs0zVlOfbKHDwpJ.4zSa.qrg95PZMTjUpi.SwW'),
(9, NULL, NULL, NULL, NULL, NULL, NULL, 'ACTIVO', '2026-03-20 20:52:36', '$2b$10$s0G0vc4hro2ODMWf47L5D.3IYQdcI2rkey74cdDxxlSJB.7OBI82G'),
(10, 'rebeca', NULL, NULL, '978256356', 'rebeca@gmail.com', NULL, 'ACTIVO', '2026-03-20 22:44:53', '$2b$10$WooDWEOAuSkWS5j1iOBSIOZDobMD3MW4BeRnjS0Rm0D2ynXvcWjUW'),
(11, 'LEYDE LILIANA', 'SANTIAGO', 'ISIDRO', NULL, 'lsantiago@gmail.com', NULL, 'ACTIVO', '2026-03-21 01:38:11', '$2b$10$yq9CRf4/cHHsLtUIj/9OqOuvWPae9GUqjloweft0i12Wtglu5.svG'),
(12, 'MERLY SOLEDAD', 'Huaman', 'Pincho', NULL, 'soledad@gmail.com', NULL, 'ACTIVO', '2026-04-02 02:21:23', '$2b$10$cJtaRaSXYdZWpzaYff4GB.1SiuYWcngNMPq8GmJroQCeGdhg1Igxa'),
(13, 'ROBERTO', 'PEREZ', 'HUAMAN', '935834799', 'roberto@gmail.com', NULL, 'ACTIVO', '2026-04-05 03:03:16', '$2b$10$oUsbJPa2IvnOFIlq.2V2bOdVsYbC9C.GikUSYVSGmVc7lt0qKOJSu'),
(14, 'LISBETH DIANA CASTRO', '', '', '912913914', 'lisbeth@gmail.com', NULL, 'ACTIVO', '2026-04-09 21:24:30', '$2b$10$Cxu2BgV3Kn2QxwG6C9x/Z.ZjO7VhsbH4a30unCzurahbcwAcQTCOm'),
(15, 'CARMEN REYES', '', '', '926427346', 'carmen@gmail.com', NULL, 'ACTIVO', '2026-04-10 03:51:13', '$2b$10$qKN.DrnhLfl1YKPEUQpenOljWXxw58e6ugA2PxxhDF4srA87xSKIq'),
(16, 'Wilder', 'Huaman', 'Picho', NULL, 'huamanpichowilder22@gmail.com', NULL, 'ACTIVO', '2026-05-14 22:51:57', '$2b$10$KFKSprJrMHMECFu7Ob9VieemSF/yUSUZQTce4OtYt23rdNQ1Bj3dq'),
(17, 'WILLIAM', 'ÑAUPARI', 'CCENTE', '930759515', 'william@gmail.com', NULL, 'ACTIVO', '2026-05-14 23:46:22', '$2b$10$wKcKCHJNS9R2OWXhphmuWeKak4796cQy0abIXp0pdKuUxnQrogjbS'),
(18, 'Greisy', 'López', 'Espinoza', NULL, 'greisy017@hotmail.com', NULL, 'ACTIVO', '2026-05-26 00:30:12', '$2b$10$wuMrxgrZ17RHydmf6dQIeunOF5.1GTYvMqAL9FbRJ3YD/98o5pV/S'),
(19, 'MERLY SOLEDAD', 'CASTRO', 'GALVEZ', NULL, 'sarai@gmail.com', NULL, 'ACTIVO', '2026-05-27 21:17:31', '$2b$10$sfEcOfYxTQq0nHCuQjSLBO7FtRj0yO0m6CL/Yb9xaiATiFpLiu5Nm'),
(20, 'aaaaa', 'adkjsf', 'dgjg', NULL, 'gdvghf@gmail.com', NULL, 'ACTIVO', '2026-05-28 01:35:26', '$2b$10$CYG7LdCbr9gkoZWVj0Hjre3S23Nsr1i/X52K2WHV1Vy2AmSPeQ09e'),
(21, 'Mely Soledad', NULL, NULL, NULL, 'merly@gmail.com', NULL, 'ACTIVO', '2026-06-03 14:56:24', '$2b$10$ll74N44ghOfVkIImv3pb3udfERWSul6oG.IJUXmj8vt28IWkqu14m'),
(22, 'MERLY SOLEDAD', 'CASTRO', 'GALVEZ', '935343635', 'soledadmerlinda@gmail.com', NULL, 'ACTIVO', '2026-06-03 20:04:21', '$2b$10$BpZsETcIr5vi.u0.6PU70.p7jVHCX/R1fEhgnvPws8wIAC7HgOZZK'),
(23, 'miriam', 'perez', 'castro', '935343635', 'miriam@gmail.com', NULL, 'ACTIVO', '2026-06-04 01:33:59', '$2b$10$zz8ZIP.n3NGSViYfBo8E9OroWDLjosECRfiteVb3jtjuOIhjEbFJu'),
(24, 'MANUEL ALEXANDER', 'LLACSAHUANGA', 'ABAD', '935343635', 'i2413502@continental.edu.pe', NULL, 'ACTIVO', '2026-06-10 21:10:36', '$2b$10$s2zfDr5EMb2HHr4ylKm29OAr6PkpaK.YI7JpmSdatkvBqhfgCUuFm'),
(25, 'Test', 'Brevo', 'Test', '999888777', 'rola.angarita31@gmail.com', NULL, 'ACTIVO', '2026-06-10 22:29:10', '$2b$10$QbGkme/dG80jTlel1XpWwONJ40pwGnesX7Gb46aKlULWidP3LJGpS'),
(26, 'Test', 'Brevo', 'Test', '999888777', 'dannyafk2000@gmail.com', NULL, 'ACTIVO', '2026-06-10 23:22:28', '$2b$10$xdPEToeb77ZSxapCqR5nO.0YEoW57vEVC7ayJFJH8TWWeZVTT9ReS'),
(27, 'GARDENIA FIDELA', 'RUIZ', 'MULLO', '986578456', 'soledadcastrogalvez@gmail.com', NULL, 'ACTIVO', '2026-06-10 23:24:06', '$2b$10$j44gcSx117W8kIO.SHAiW.ULy77tk6hwZdz4jN59mM1RbXf3sXeqG'),
(28, 'MOISES', 'HUANACO', 'QUISPE', '987654321', 'clinicakiramedic@gmail.com', NULL, 'ACTIVO', '2026-06-10 23:33:04', '$2b$10$x8kK.Vjo1asXnoW5IP/bxuXkMxhDubKsPTJcjZ1RJPDbKGKXAGSvG'),
(29, 'CRISPIN MARIO', 'SAAVEDRA', 'LOPEZ', '965874584', 'soporteofiapp@gmail.com', NULL, 'ACTIVO', '2026-06-10 23:35:59', '$2b$10$cHrcUrM4.17.Ns/HHHDelufUc9d174b1zlvIvdQ8xb8Rs0qDmWcWC'),
(30, 'YOMIRA FELICIA', 'ANCHIRAICO', 'SABRERA', '952164624', 'rebemongeenriquez@gmail.com', NULL, 'ACTIVO', '2026-06-11 01:28:28', '$2b$10$TnWBOG0z.w.iXR6Drpi4lu9VNylLbPEPijNOXtnBX8Q8rOT0Nm7bS'),
(31, 'JEZABEL REBECA', 'MONGE', 'ENRIQUEZ', '908373737', 'prueba1rebeca@gmail.com', NULL, 'ACTIVO', '2026-06-17 00:00:52', '$2b$10$wlivnrYspJ9n615ZfFYnROf2TxFdqEgSPXKT8.nPtnNw5lv6oS4WW');

-- --------------------------------------------------------

--
-- Table structure for table `producto`
--

CREATE TABLE `producto` (
  `id_producto` int(11) NOT NULL,
  `nombre` varchar(150) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  `precio_venta` decimal(10,2) DEFAULT NULL,
  `codigo_barra` varchar(50) DEFAULT NULL,
  `id_categoria` int(11) DEFAULT NULL,
  `id_tipo_animal` int(11) DEFAULT NULL,
  `stock_actual` int(11) DEFAULT NULL,
  `stock_minimo` int(11) DEFAULT NULL,
  `stock_alerta` int(11) DEFAULT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `estado` enum('ACTIVO','INACTIVO') DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `marca` varchar(100) DEFAULT NULL,
  `ficha_tecnica` text DEFAULT NULL,
  `colores` varchar(200) DEFAULT NULL,
  `composicion` text DEFAULT NULL,
  `modo_uso` text DEFAULT NULL,
  `peso_presentacion` varchar(100) DEFAULT NULL,
  `tallas` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `producto`
--

INSERT INTO `producto` (`id_producto`, `nombre`, `descripcion`, `imagen`, `precio_venta`, `codigo_barra`, `id_categoria`, `id_tipo_animal`, `stock_actual`, `stock_minimo`, `stock_alerta`, `fecha_vencimiento`, `estado`, `fecha_creacion`, `marca`, `ficha_tecnica`, `colores`, `composicion`, `modo_uso`, `peso_presentacion`, `tallas`) VALUES
(1, 'Croquetas Premium', 'Alimento balanceado para perro', 'croquetas.webp', 120.00, 'ABC123', 1, 1, 27, 10, 5, '2026-12-31', 'ACTIVO', '2026-05-14 23:45:47', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 'Antipulgas', 'Medicamento para pulgas', 'antipulgas.jpg', 35.00, 'DEF456', 2, 1, 11, 5, 3, '2026-06-30', 'ACTIVO', '2026-05-27 21:23:13', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(3, 'Collar para gato', 'Collar ajustable', 'collar.webp\r\n', 20.00, 'GHI789', 3, 2, 24, 8, 4, NULL, 'ACTIVO', '2026-05-27 21:23:14', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(5, 'Desparasitante Interno Total', 'Tabletas para eliminación de parásitos internos en gatos.', 'ANTIPARASITARIO.webp', 15.00, 'MED002', 2, 2, -4, 15, 8, '2026-04-05', 'ACTIVO', '2026-04-02 04:27:48', 'PetCare', NULL, NULL, NULL, NULL, 'Caja x 4 tabletas', NULL),
(7, 'Antiinflamatorio Canino', 'Alivio del dolor y la inflamación en articulaciones.', 'antiiflamatorios.jpg', 38.00, 'MED004', 2, 1, 2, 10, 4, '2026-05-20', 'INACTIVO', '2026-04-09 14:50:42', 'HealthPet', NULL, NULL, NULL, NULL, 'Blister x 10 comp', NULL),
(8, 'CROQUETAS', 'TFYFYUG', NULL, 40.00, NULL, NULL, NULL, 12, 5, NULL, NULL, 'INACTIVO', '2026-03-20 23:31:41', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(9, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 5, NULL, NULL, 'INACTIVO', '2026-03-20 23:31:35', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(10, 'holaa', 'jhdhfhs', NULL, 6.00, NULL, 2, 2, 10, 5, NULL, '2026-04-20', 'INACTIVO', '2026-03-20 23:31:45', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(15, 'mndsnhjjd', '53', NULL, 656.00, NULL, 3, 1, 23, 5, NULL, NULL, 'INACTIVO', '2026-04-09 14:50:59', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(16, 'mndsnhjjd', '43w', NULL, 45.00, NULL, 3, 6, 5673, 5, NULL, NULL, 'INACTIVO', '2026-04-09 14:51:02', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(17, 'holaaaaa', '.rnnw', NULL, 23.00, NULL, 3, 3, 5000, 5, NULL, NULL, 'INACTIVO', '2026-04-09 14:51:05', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(18, 'HOLAAA', 'KMFVDL', NULL, 200.00, NULL, 2, 4, 200, 5, NULL, NULL, 'INACTIVO', '2026-04-09 14:51:08', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(19, 'SOLE', 'M VD,M', NULL, 35.00, NULL, 3, 4, 35, 5, NULL, NULL, 'INACTIVO', '2026-04-09 14:51:11', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(21, 'hbj,nkjn', 'gvh,bjbjyut', NULL, 6.00, NULL, 3, 4, 200, 5, NULL, NULL, 'INACTIVO', '2026-04-09 14:51:15', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(22, 'HEWBFJNSJKN', 'HEFBJEWHF', NULL, 40.00, NULL, 3, 1, 100, 5, NULL, NULL, 'INACTIVO', '2026-04-09 14:51:18', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(23, 'holaaaaa', '44ta', '1775708146003-809541.jpg', 41.00, NULL, 2, 1, 100, 5, NULL, NULL, 'INACTIVO', '2026-04-09 19:37:15', NULL, 'tytyd', NULL, 't5ed56', 'ytt', NULL, NULL),
(24, 'soleeeMERLY', 'dsvhkjdv', '1775763242442-375726.jpg', 200.00, NULL, 2, 8, 173, 5, NULL, '2026-04-18', 'ACTIVO', '2026-05-14 23:45:47', 'ndkv', 'https://drive.google.com/file/d/1SuMV0f-25kmcuORhNdoBdlAPWLibUlMJ/view?usp=drive_link', NULL, 'gxh', 'yhthdbjfbhjkMERLY', NULL, NULL),
(28, 'dianaaa', 'dyj', '1775764111211-513676.jpg', 50.00, NULL, 2, 6, 458, 5, NULL, '2021-02-15', 'ACTIVO', '2026-06-03 20:05:09', 'ndkvre', 'https://drive.google.com/file/d/1SuMV0f-25kmcuORhNdoBdlAPWLibUlMJ/view?usp=drive_link', NULL, 'gxh', 'yhthdbjfbhjkMERLY', NULL, NULL),
(29, 'doijxx', 'eebcjke ', '1775764268654-922104.jpg', 1000.00, NULL, 2, 2, 81, 5, NULL, '2026-07-31', 'ACTIVO', '2026-06-04 01:45:07', 'ggn', 'https://drive.google.com/file/d/1SuMV0f-25kmcuORhNdoBdlAPWLibUlMJ/view?usp=drive_link', NULL, 'vhjh', 'hbhj', NULL, NULL),
(30, 'bv', 'hfjkh', '1775764403798-483457.jpg', 40000.00, NULL, 1, 2, 417, 5, NULL, '2026-04-24', 'INACTIVO', '2026-06-03 20:33:35', 'njdnv', 'vgyhb', NULL, 'pollo', NULL, NULL, NULL),
(31, 'hdsh', 'vmnf j', '1775764468464-599212.webp', 200.00, NULL, 3, 1, 3, 5, NULL, NULL, 'ACTIVO', '2026-05-14 23:45:48', 'dvf', 'es de algodon ', 'rojo,verde', NULL, NULL, NULL, 'S,M'),
(44, 'antipulgas', 'hddjd', NULL, 40.00, '52883', 2, 3, 50, 5, NULL, '2026-08-13', 'ACTIVO', '2026-06-03 20:42:57', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(45, 'collar', 'tamaño s ', NULL, 13.00, NULL, 3, 1, 99, 5, NULL, NULL, 'ACTIVO', '2026-06-10 21:11:28', 'kong', 'DE ALGODO', 'rojo,amarillo,celeste', NULL, NULL, NULL, 's,m,L'),
(46, 'jgll', 'gh j j', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS6k5IMWaUtuVoIfv2WRW5P3WETaBJOn8JeWmanF7K0MKlVi4TEdrLmdTP_&s=10', 45.00, NULL, 1, 1, 100, 5, NULL, '2026-06-26', 'ACTIVO', '2026-06-18 02:36:55', 'fdhrts', 'tyufty', NULL, 'tutdu', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `provincia`
--

CREATE TABLE `provincia` (
  `id_provincia` int(11) NOT NULL,
  `id_departamento` int(11) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_spanish2_ci;

--
-- Dumping data for table `provincia`
--

INSERT INTO `provincia` (`id_provincia`, `id_departamento`, `nombre`) VALUES
(1, 1, 'Huancayo'),
(2, 1, 'Concepción'),
(3, 1, 'Chanchamayo'),
(4, 1, 'Jauja'),
(5, 1, 'Junín'),
(6, 1, 'Satipo'),
(7, 1, 'Tarma'),
(8, 1, 'Yauli'),
(9, 1, 'Chupaca');

-- --------------------------------------------------------

--
-- Table structure for table `tipo_animal`
--

CREATE TABLE `tipo_animal` (
  `id_tipo_animal` int(11) NOT NULL,
  `nombre` varchar(50) DEFAULT NULL,
  `estado` enum('ACTIVO','INACTIVO') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tipo_animal`
--

INSERT INTO `tipo_animal` (`id_tipo_animal`, `nombre`, `estado`) VALUES
(1, 'Perro', 'ACTIVO'),
(2, 'Gato', 'ACTIVO'),
(3, 'Ave', 'ACTIVO'),
(4, 'conejo', 'ACTIVO'),
(5, 'Camello', 'ACTIVO'),
(6, 'cerdo', 'ACTIVO'),
(8, 'pollo', 'ACTIVO');

-- --------------------------------------------------------

--
-- Table structure for table `tipo_comprobante`
--

CREATE TABLE `tipo_comprobante` (
  `id_tipo_comprobante` int(11) NOT NULL,
  `nombre` varchar(50) DEFAULT NULL,
  `estado` enum('ACTIVO','INACTIVO') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tipo_comprobante`
--

INSERT INTO `tipo_comprobante` (`id_tipo_comprobante`, `nombre`, `estado`) VALUES
(1, 'Boleta', 'ACTIVO'),
(2, 'Factura', 'ACTIVO');

-- --------------------------------------------------------

--
-- Table structure for table `tipo_documento`
--

CREATE TABLE `tipo_documento` (
  `id_tipo_documento` int(11) NOT NULL,
  `nombre` varchar(20) DEFAULT NULL,
  `descripcion` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tipo_documento`
--

INSERT INTO `tipo_documento` (`id_tipo_documento`, `nombre`, `descripcion`) VALUES
(1, 'DNI', 'Documento Nacional de Identidad'),
(2, 'RUC', 'Registro Único de Contribuyente');

-- --------------------------------------------------------

--
-- Table structure for table `tipo_pago`
--

CREATE TABLE `tipo_pago` (
  `id_tipo_pago` int(11) NOT NULL,
  `nombre` varchar(50) DEFAULT NULL,
  `estado` enum('ACTIVO','INACTIVO') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tipo_pago`
--

INSERT INTO `tipo_pago` (`id_tipo_pago`, `nombre`, `estado`) VALUES
(1, 'Billetera digital', 'ACTIVO'),
(2, 'Tarjeta', 'ACTIVO');

-- --------------------------------------------------------

--
-- Table structure for table `user_ai_context`
--

CREATE TABLE `user_ai_context` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `mascotas` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`mascotas`)),
  `categorias_favoritas` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`categorias_favoritas`)),
  `ultima_interaccion` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `zona_envio`
--

CREATE TABLE `zona_envio` (
  `id_zona` int(11) NOT NULL,
  `nombre_zona` varchar(100) DEFAULT NULL,
  `costo_envio` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `zona_envio`
--

INSERT INTO `zona_envio` (`id_zona`, `nombre_zona`, `costo_envio`) VALUES
(1, 'Zona Centro', 5.00),
(2, 'Zona Norte', 8.00),
(3, 'Zona Sur', 10.00);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cargo`
--
ALTER TABLE `cargo`
  ADD PRIMARY KEY (`id_cargo`);

--
-- Indexes for table `categoria_producto`
--
ALTER TABLE `categoria_producto`
  ADD PRIMARY KEY (`id_categoria`);

--
-- Indexes for table `chat_ia`
--
ALTER TABLE `chat_ia`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_chat_user` (`user_id`),
  ADD KEY `idx_chat_fecha` (`creado_en`);

--
-- Indexes for table `cliente`
--
ALTER TABLE `cliente`
  ADD PRIMARY KEY (`id_cliente`),
  ADD KEY `id_persona` (`id_persona`),
  ADD KEY `id_tipo_documento` (`id_tipo_documento`);

--
-- Indexes for table `colaborador`
--
ALTER TABLE `colaborador`
  ADD PRIMARY KEY (`id_colaborador`),
  ADD KEY `id_persona` (`id_persona`),
  ADD KEY `id_cargo` (`id_cargo`);

--
-- Indexes for table `comprobante`
--
ALTER TABLE `comprobante`
  ADD PRIMARY KEY (`id_comprobante`),
  ADD KEY `id_pedido` (`id_pedido`);

--
-- Indexes for table `departamento`
--
ALTER TABLE `departamento`
  ADD PRIMARY KEY (`id_departamento`);

--
-- Indexes for table `detalle_pedido`
--
ALTER TABLE `detalle_pedido`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `id_pedido` (`id_pedido`),
  ADD KEY `id_producto` (`id_producto`);

--
-- Indexes for table `distrito`
--
ALTER TABLE `distrito`
  ADD PRIMARY KEY (`id_distrito`),
  ADD KEY `id_provincia` (`id_provincia`);

--
-- Indexes for table `fcm_tokens`
--
ALTER TABLE `fcm_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_token` (`token`(255));

--
-- Indexes for table `imagen_producto`
--
ALTER TABLE `imagen_producto`
  ADD PRIMARY KEY (`id_imagen`),
  ADD KEY `id_producto` (`id_producto`);

--
-- Indexes for table `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `pago`
--
ALTER TABLE `pago`
  ADD PRIMARY KEY (`id_pago`),
  ADD KEY `id_pedido` (`id_pedido`),
  ADD KEY `id_tipo_pago` (`id_tipo_pago`);

--
-- Indexes for table `pedido`
--
ALTER TABLE `pedido`
  ADD PRIMARY KEY (`id_pedido`),
  ADD KEY `id_cliente` (`id_cliente`),
  ADD KEY `id_zona` (`id_zona`),
  ADD KEY `id_tipo_comprobante` (`id_tipo_comprobante`),
  ADD KEY `id_distrito` (`id_distrito`);

--
-- Indexes for table `persona`
--
ALTER TABLE `persona`
  ADD PRIMARY KEY (`id_persona`);

--
-- Indexes for table `producto`
--
ALTER TABLE `producto`
  ADD PRIMARY KEY (`id_producto`),
  ADD KEY `id_categoria` (`id_categoria`),
  ADD KEY `id_tipo_animal` (`id_tipo_animal`);

--
-- Indexes for table `provincia`
--
ALTER TABLE `provincia`
  ADD PRIMARY KEY (`id_provincia`),
  ADD KEY `id_departamento` (`id_departamento`);

--
-- Indexes for table `tipo_animal`
--
ALTER TABLE `tipo_animal`
  ADD PRIMARY KEY (`id_tipo_animal`);

--
-- Indexes for table `tipo_comprobante`
--
ALTER TABLE `tipo_comprobante`
  ADD PRIMARY KEY (`id_tipo_comprobante`);

--
-- Indexes for table `tipo_documento`
--
ALTER TABLE `tipo_documento`
  ADD PRIMARY KEY (`id_tipo_documento`);

--
-- Indexes for table `tipo_pago`
--
ALTER TABLE `tipo_pago`
  ADD PRIMARY KEY (`id_tipo_pago`);

--
-- Indexes for table `user_ai_context`
--
ALTER TABLE `user_ai_context`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `zona_envio`
--
ALTER TABLE `zona_envio`
  ADD PRIMARY KEY (`id_zona`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `cargo`
--
ALTER TABLE `cargo`
  MODIFY `id_cargo` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `categoria_producto`
--
ALTER TABLE `categoria_producto`
  MODIFY `id_categoria` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `chat_ia`
--
ALTER TABLE `chat_ia`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cliente`
--
ALTER TABLE `cliente`
  MODIFY `id_cliente` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `colaborador`
--
ALTER TABLE `colaborador`
  MODIFY `id_colaborador` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `comprobante`
--
ALTER TABLE `comprobante`
  MODIFY `id_comprobante` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `departamento`
--
ALTER TABLE `departamento`
  MODIFY `id_departamento` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `detalle_pedido`
--
ALTER TABLE `detalle_pedido`
  MODIFY `id_detalle` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `distrito`
--
ALTER TABLE `distrito`
  MODIFY `id_distrito` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `fcm_tokens`
--
ALTER TABLE `fcm_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=77;

--
-- AUTO_INCREMENT for table `imagen_producto`
--
ALTER TABLE `imagen_producto`
  MODIFY `id_imagen` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notificaciones`
--
ALTER TABLE `notificaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `pago`
--
ALTER TABLE `pago`
  MODIFY `id_pago` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `pedido`
--
ALTER TABLE `pedido`
  MODIFY `id_pedido` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `persona`
--
ALTER TABLE `persona`
  MODIFY `id_persona` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `producto`
--
ALTER TABLE `producto`
  MODIFY `id_producto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT for table `provincia`
--
ALTER TABLE `provincia`
  MODIFY `id_provincia` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `tipo_animal`
--
ALTER TABLE `tipo_animal`
  MODIFY `id_tipo_animal` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tipo_comprobante`
--
ALTER TABLE `tipo_comprobante`
  MODIFY `id_tipo_comprobante` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tipo_documento`
--
ALTER TABLE `tipo_documento`
  MODIFY `id_tipo_documento` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tipo_pago`
--
ALTER TABLE `tipo_pago`
  MODIFY `id_tipo_pago` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `user_ai_context`
--
ALTER TABLE `user_ai_context`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `zona_envio`
--
ALTER TABLE `zona_envio`
  MODIFY `id_zona` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `cliente`
--
ALTER TABLE `cliente`
  ADD CONSTRAINT `cliente_ibfk_1` FOREIGN KEY (`id_persona`) REFERENCES `persona` (`id_persona`),
  ADD CONSTRAINT `cliente_ibfk_2` FOREIGN KEY (`id_tipo_documento`) REFERENCES `tipo_documento` (`id_tipo_documento`);

--
-- Constraints for table `colaborador`
--
ALTER TABLE `colaborador`
  ADD CONSTRAINT `colaborador_ibfk_1` FOREIGN KEY (`id_persona`) REFERENCES `persona` (`id_persona`),
  ADD CONSTRAINT `colaborador_ibfk_2` FOREIGN KEY (`id_cargo`) REFERENCES `cargo` (`id_cargo`);

--
-- Constraints for table `comprobante`
--
ALTER TABLE `comprobante`
  ADD CONSTRAINT `comprobante_ibfk_1` FOREIGN KEY (`id_pedido`) REFERENCES `pedido` (`id_pedido`);

--
-- Constraints for table `detalle_pedido`
--
ALTER TABLE `detalle_pedido`
  ADD CONSTRAINT `detalle_pedido_ibfk_1` FOREIGN KEY (`id_pedido`) REFERENCES `pedido` (`id_pedido`),
  ADD CONSTRAINT `detalle_pedido_ibfk_2` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id_producto`);

--
-- Constraints for table `distrito`
--
ALTER TABLE `distrito`
  ADD CONSTRAINT `distrito_ibfk_1` FOREIGN KEY (`id_provincia`) REFERENCES `provincia` (`id_provincia`);

--
-- Constraints for table `imagen_producto`
--
ALTER TABLE `imagen_producto`
  ADD CONSTRAINT `imagen_producto_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id_producto`);

--
-- Constraints for table `pago`
--
ALTER TABLE `pago`
  ADD CONSTRAINT `pago_ibfk_1` FOREIGN KEY (`id_pedido`) REFERENCES `pedido` (`id_pedido`),
  ADD CONSTRAINT `pago_ibfk_2` FOREIGN KEY (`id_tipo_pago`) REFERENCES `tipo_pago` (`id_tipo_pago`);

--
-- Constraints for table `pedido`
--
ALTER TABLE `pedido`
  ADD CONSTRAINT `pedido_ibfk_1` FOREIGN KEY (`id_cliente`) REFERENCES `cliente` (`id_cliente`),
  ADD CONSTRAINT `pedido_ibfk_2` FOREIGN KEY (`id_zona`) REFERENCES `zona_envio` (`id_zona`),
  ADD CONSTRAINT `pedido_ibfk_3` FOREIGN KEY (`id_tipo_comprobante`) REFERENCES `tipo_comprobante` (`id_tipo_comprobante`),
  ADD CONSTRAINT `pedido_ibfk_4` FOREIGN KEY (`id_distrito`) REFERENCES `distrito` (`id_distrito`);

--
-- Constraints for table `producto`
--
ALTER TABLE `producto`
  ADD CONSTRAINT `producto_ibfk_1` FOREIGN KEY (`id_categoria`) REFERENCES `categoria_producto` (`id_categoria`),
  ADD CONSTRAINT `producto_ibfk_2` FOREIGN KEY (`id_tipo_animal`) REFERENCES `tipo_animal` (`id_tipo_animal`);

--
-- Constraints for table `provincia`
--
ALTER TABLE `provincia`
  ADD CONSTRAINT `provincia_ibfk_1` FOREIGN KEY (`id_departamento`) REFERENCES `departamento` (`id_departamento`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
