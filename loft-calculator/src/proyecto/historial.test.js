// Tests del historial para deshacer / rehacer (v1.18). Correr con: npm test
import { describe, it, expect } from 'vitest';
import { historialVacio, registrarCambio, deshacer, rehacer, MAXIMO_PASOS, AGRUPAR_MS } from './historial.js';

describe('deshacer y rehacer', () => {
  it('sin cambios no hay nada para deshacer ni rehacer', () => {
    expect(deshacer(historialVacio(), 'A')).toBeNull();
    expect(rehacer(historialVacio(), 'A')).toBeNull();
  });

  it('A -> B -> C: deshacer vuelve a B y a A; rehacer vuelve a B', () => {
    let h = registrarCambio(historialVacio(), 'A', 1000); // A -> B
    h = registrarCambio(h, 'B', 5000); // B -> C (separado en el tiempo)
    const uno = deshacer(h, 'C');
    expect(uno.foto).toBe('B');
    const dos = deshacer(uno.historial, 'B');
    expect(dos.foto).toBe('A');
    expect(deshacer(dos.historial, 'A')).toBeNull();
    const tres = rehacer(dos.historial, 'A');
    expect(tres.foto).toBe('B');
  });

  it('un cambio nuevo después de deshacer borra lo que se podía rehacer', () => {
    let h = registrarCambio(historialVacio(), 'A', 1000);
    h = deshacer(h, 'B').historial;
    h = registrarCambio(h, 'A', 9000); // A -> X
    expect(rehacer(h, 'X')).toBeNull();
  });

  it('cambios seguidos (escribir) se juntan en un solo paso', () => {
    let h = registrarCambio(historialVacio(), '7', 1000); // 7 -> 7.
    h = registrarCambio(h, '7.', 1000 + AGRUPAR_MS / 2); // 7. -> 7.5
    h = registrarCambio(h, '7.5', 1000 + AGRUPAR_MS); // 7.5 -> 7.50 (todavía seguido)
    expect(h.pasado).toEqual(['7']);
    expect(deshacer(h, '7.50').foto).toBe('7');
  });

  it(`guarda como mucho ${MAXIMO_PASOS} pasos (se olvidan los más viejos)`, () => {
    let h = historialVacio();
    for (let i = 0; i < MAXIMO_PASOS + 10; i++) h = registrarCambio(h, i, i * 10000);
    expect(h.pasado).toHaveLength(MAXIMO_PASOS);
    expect(h.pasado[0]).toBe(10);
  });
});
