# Simulador de caldera (la "planta")

Genera lecturas realistas de sensores (con inercia, ruido y eventos) y las envía al servidor `boiler-efficiency-iiot`.

```bash
# local
node simulator.js
# contra tu servidor en la nube
SERVER_URL=https://tu-servidor.onrender.com API_KEY=tu-clave node simulator.js
```

| Opción | Descripción |
|---|---|
| `--scenario=demo` | Historia guiada de ~4 min: normal → exceso de aire → corrección → ensuciamiento → limpieza → combustión incompleta → falla de sensor O₂ (por defecto) |
| `--scenario=<nombre>` | Fija un escenario: `normal`, `exceso_aire`, `ensuciamiento`, `comb_incompleta`, `humedad_comb`, `falla_o2` |
| `--speed=3` | Acelera la historia 3× |
| `FUEL=Madera` | Cualquier combustible de la tabla (Carbón, Bagazo de caña, Diésel, Gas natural…) |
| `INTERVAL=1500` | Milisegundos entre lecturas |

Para pasar a producción se reemplaza este simulador por el gateway real; el servidor no cambia.
