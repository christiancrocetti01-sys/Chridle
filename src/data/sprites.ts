/**
 * Sprite pixel art provvisori, definiti come griglie di caratteri.
 * '.' = trasparente; ogni altro carattere è una chiave della palette.
 * Verranno sostituiti da asset veri (vedi docs/CREDITS.md).
 */
export interface PixelSprite {
  palette: Record<string, string>;
  rows: string[];
}

const OUTLINE = '#0b0d17';

export const HERO: PixelSprite = {
  palette: {
    K: OUTLINE,
    S: '#9aa4b8', s: '#5b6378',
    G: '#e8c15a', g: '#a3792c',
    W: '#fff6d6', E: '#ffe9a8',
    C: '#2a3a6b', c: '#1a2448',
  },
  rows: [
    '.......KKKK......KK.',
    '......KSSSSK....KWK.',
    '.....KSSSSSSK...KWK.',
    '.....KSKEEKSK...KWK.',
    '.....KSSSSSSK...KWK.',
    '......KGGGGK....KWK.',
    '....KKSSSSSSKK..KWK.',
    '...KCKSSGGSSKSK.KWK.',
    '..KCCKSGWWGSKSSKKWK.',
    '..KCCKSSGGSSKKSKGGGK',
    '..KCCKSSSSSSK.KSKgK.',
    '..KCCKgGGGGgK..KKgK.',
    '..KCcKSSSSSSK...KgK.',
    '..KCcKSSKKSSK....K..',
    '..KccKSSK.KSSK......',
    '...KKKSSK..KSK......',
    '.....KSSK..KSK......',
    '.....KssK..KsK......',
    '....KSSSK..KSSK.....',
    '....KKKKK..KKKK.....',
  ],
};

export const GHOUL: PixelSprite = {
  palette: {
    K: OUTLINE,
    P: '#7a6a8c', p: '#4e4160',
    R: '#ff6a3d', B: '#ece4cf',
  },
  rows: [
    '....KKKKKK......',
    '...KppppppK.....',
    '..KpPPPPPPpK....',
    '..KPRKPPRKPK....',
    '..KPPPPPPPPK....',
    '..KPBKBKBKPK....',
    '...KPPPPPPK.....',
    '..KKPPPPPPKK....',
    '.KPPKPPPPKPPK...',
    'KPPK.KPPK.KPPK..',
    'KBK..KPPK..KBK..',
    '.K...KPPK...K...',
    '....KPPPPK......',
    '...KPPKKPPK.....',
    '...KPK..KPK.....',
    '...KKK..KKK.....',
  ],
};

/**
 * Frame di "respiro": la parte sopra `splitRow` scende di 1px, le gambe restano ferme.
 */
export function breathFrame(sprite: PixelSprite, splitRow: number): PixelSprite {
  const { rows } = sprite;
  const blank = '.'.repeat(rows[0].length);
  const top = [blank, ...rows.slice(0, splitRow - 1)];
  return { palette: sprite.palette, rows: [...top, ...rows.slice(splitRow)] };
}

/** Errori di forma: righe di lunghezza diversa o caratteri senza colore. */
export function validateSprite(sprite: PixelSprite): string[] {
  const errors: string[] = [];
  const width = sprite.rows[0]?.length ?? 0;
  sprite.rows.forEach((row, y) => {
    if (row.length !== width) errors.push(`riga ${y}: lunghezza ${row.length}, attesa ${width}`);
    for (const ch of row) {
      if (ch !== '.' && !(ch in sprite.palette)) errors.push(`riga ${y}: colore '${ch}' non in palette`);
    }
  });
  return errors;
}
