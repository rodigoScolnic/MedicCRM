# MedicCRM — Presupuesto diario

Módulo web para registrar ingresos diarios, definir objetivos y consultar estadísticas.

## Funcionalidades
- Registro rápido de ingresos por fecha y categoría.
- Objetivo diario y barra de progreso.
- Resumen de hoy, promedio de 7 días y total del mes.
- Gráfico de ingresos de 7, 14 o 30 días.
- Historial reciente con eliminación y exportación TSV.
- Diseño responsive para escritorio y móvil.

## Ejecutar
No requiere instalación ni backend. Abrí `index.html` en un navegador o publicá el repositorio como sitio estático.

Chart.js y las fuentes tipográficas se cargan desde CDN, por lo que los gráficos y fuentes requieren conexión a internet.

## Persistencia y privacidad
Los registros se guardan en `localStorage` del navegador y dispositivo actual. No se envían a un servidor. Si se borran los datos del navegador o se cambia de dispositivo/navegador, los registros no estarán disponibles allí. Para uso multiusuario y sincronización entre dispositivos se deberá conectar una API y una base de datos.

## Moneda
Los importes se muestran en pesos argentinos (ARS).
