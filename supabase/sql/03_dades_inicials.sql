-- =============================================================================
-- 03 · Dades inicials: taxonomies i catàleg actual (generat des de data/apps.json)
-- Requereix 01 i 02. Es pot tornar a executar: no duplica res.
-- =============================================================================

insert into public.ambits (id, nom, ordre) values
  ('matematiques', 'Matemàtiques', 1),
  ('ciencies', 'Ciències', 2),
  ('llengues', 'Llengües', 3),
  ('socials', 'Ciències socials', 4),
  ('tecnologia', 'Tecnologia i programació', 5),
  ('arts', 'Arts i música', 6),
  ('eines', 'Eines d''aula', 7)
on conflict (id) do update set nom = excluded.nom, ordre = excluded.ordre;

insert into public.nivells (id, nom, ordre) values
  ('infantil', 'Infantil', 1),
  ('primaria', 'Primària', 2),
  ('eso', 'ESO', 3),
  ('batxillerat', 'Batxillerat', 4),
  ('fp', 'FP', 5)
on conflict (id) do update set nom = excluded.nom, ordre = excluded.ordre;

insert into public.idiomes (id, nom, ordre) values
  ('ca', 'Català', 1),
  ('es', 'Castellà', 2),
  ('en', 'Anglès', 3),
  ('fr', 'Francès', 4)
on conflict (id) do update set nom = excluded.nom, ordre = excluded.ordre;

insert into public.apps
  (slug, titol, descripcio, detall, url, codi, autor_nom, autor_url, ambit,
   nivells, idiomes, etiquetes, estat, created_at, publicada_at)
values
  ('phet-simulacions', 'PhET Simulacions interactives', 'Simulacions de física, química, biologia i matemàtiques per explorar fenòmens manipulant variables.', 'Col·lecció de simulacions interactives basades en recerca educativa. Permeten experimentar amb circuits, forces, ones, reaccions químiques o fraccions modificant paràmetres i observant-ne l''efecte en temps real. Funcionen al navegador i moltes estan traduïdes al català.', 'https://phet.colorado.edu/', 'https://github.com/phetsims', 'Universitat de Colorado Boulder', 'https://phet.colorado.edu/', 'ciencies', array['primaria', 'eso', 'batxillerat']::text[], array['ca', 'es', 'en', 'fr']::text[], array['física', 'química', 'simulació', 'laboratori virtual']::text[], 'publicada', '2026-01-12'::timestamptz, '2026-01-12'::timestamptz),
  ('geogebra-classic', 'GeoGebra Classic', 'Geometria dinàmica, àlgebra, gràfics i càlcul en una sola eina per construir i investigar.', 'Entorn de matemàtiques dinàmiques que combina geometria, àlgebra, fulls de càlcul, gràfics i estadística. Ideal per fer construccions manipulables, visualitzar funcions o preparar activitats d''investigació.', 'https://www.geogebra.org/classic', null, 'GeoGebra', 'https://www.geogebra.org/', 'matematiques', array['primaria', 'eso', 'batxillerat']::text[], array['ca', 'es', 'en', 'fr']::text[], array['geometria', 'funcions', 'àlgebra', 'estadística']::text[], 'publicada', '2026-01-15'::timestamptz, '2026-01-15'::timestamptz),
  ('desmos-calculadora', 'Calculadora gràfica Desmos', 'Representa funcions, punts i desigualtats amb lliscadors per veure com canvien els paràmetres.', null, 'https://www.desmos.com/calculator', null, 'Desmos Studio', 'https://www.desmos.com/', 'matematiques', array['eso', 'batxillerat']::text[], array['ca', 'es', 'en', 'fr']::text[], array['funcions', 'gràfics', 'calculadora']::text[], 'publicada', '2026-02-03'::timestamptz, '2026-02-03'::timestamptz),
  ('scratch', 'Scratch', 'Programació amb blocs per crear històries, jocs i animacions interactives i compartir-les.', 'Llenguatge de programació visual pensat per a infants i joves. Afavoreix el pensament computacional, la creativitat i el treball col·laboratiu. L''editor funciona al navegador i es pot fer servir sense compte.', 'https://scratch.mit.edu/', 'https://github.com/scratchfoundation/scratch-gui', 'Scratch Foundation', 'https://www.scratchfoundation.org/', 'tecnologia', array['primaria', 'eso']::text[], array['ca', 'es', 'en', 'fr']::text[], array['programació', 'blocs', 'pensament computacional', 'jocs']::text[], 'publicada', '2026-02-10'::timestamptz, '2026-02-10'::timestamptz),
  ('blockly-games', 'Blockly Games', 'Seqüència de jocs progressius per aprendre conceptes de programació sense experiència prèvia.', null, 'https://blockly.games/', 'https://github.com/google/blockly-games', 'Google', 'https://developers.google.com/blockly', 'tecnologia', array['primaria', 'eso']::text[], array['ca', 'es', 'en', 'fr']::text[], array['programació', 'blocs', 'bucles', 'condicionals']::text[], 'publicada', '2026-02-18'::timestamptz, '2026-02-18'::timestamptz),
  ('stellarium-web', 'Stellarium Web', 'Planetari al navegador: observa el cel de qualsevol lloc i moment, amb constel·lacions i planetes.', null, 'https://stellarium-web.org/', 'https://github.com/Stellarium/stellarium-web-engine', 'Stellarium Labs', 'https://stellarium-labs.com/', 'ciencies', array['primaria', 'eso', 'batxillerat']::text[], array['en', 'es', 'fr']::text[], array['astronomia', 'planetari', 'constel·lacions']::text[], 'publicada', '2026-03-02'::timestamptz, '2026-03-02'::timestamptz),
  ('chrome-music-lab', 'Chrome Music Lab', 'Experiments sonors per descobrir ritme, melodia, harmonia i ones de manera visual i lúdica.', null, 'https://musiclab.chromeexperiments.com/', null, 'Google Creative Lab', 'https://musiclab.chromeexperiments.com/About', 'arts', array['infantil', 'primaria', 'eso']::text[], array['en', 'es', 'fr']::text[], array['música', 'ritme', 'so', 'composició']::text[], 'publicada', '2026-03-09'::timestamptz, '2026-03-09'::timestamptz),
  ('ptable', 'Taula periòdica dinàmica', 'Taula periòdica interactiva amb propietats, orbitals, isòtops i compostos de cada element.', null, 'https://ptable.com/', null, 'Michael Dayah', 'https://ptable.com/', 'ciencies', array['eso', 'batxillerat']::text[], array['ca', 'es', 'en', 'fr']::text[], array['química', 'elements', 'taula periòdica']::text[], 'publicada', '2026-03-20'::timestamptz, '2026-03-20'::timestamptz),
  ('circuitjs', 'Simulador de circuits', 'Dissenya circuits elèctrics i electrònics i observa el corrent i les tensions en temps real.', null, 'https://www.falstad.com/circuit/', 'https://github.com/sharpie7/circuitjs1', 'Paul Falstad i Iain Sharp', 'https://www.falstad.com/', 'tecnologia', array['eso', 'batxillerat', 'fp']::text[], array['en', 'es', 'fr']::text[], array['electricitat', 'electrònica', 'circuits', 'simulació']::text[], 'publicada', '2026-04-01'::timestamptz, '2026-04-01'::timestamptz),
  ('ophysics', 'oPhysics', 'Simulacions de física clàssica: cinemàtica, dinàmica, ones, òptica i electromagnetisme.', null, 'https://ophysics.com/', null, 'Tom Walsh', 'https://ophysics.com/', 'ciencies', array['batxillerat']::text[], array['en']::text[], array['física', 'cinemàtica', 'òptica', 'simulació']::text[], 'publicada', '2026-04-14'::timestamptz, '2026-04-14'::timestamptz),
  ('excalidraw', 'Excalidraw', 'Pissarra digital d''estil fet a mà per a esquemes, mapes conceptuals i treball col·laboratiu.', null, 'https://excalidraw.com/', 'https://github.com/excalidraw/excalidraw', 'Comunitat Excalidraw', 'https://github.com/excalidraw', 'eines', array['primaria', 'eso', 'batxillerat', 'fp']::text[], array['ca', 'es', 'en', 'fr']::text[], array['pissarra', 'esquemes', 'col·laboració', 'mapes conceptuals']::text[], 'publicada', '2026-04-22'::timestamptz, '2026-04-22'::timestamptz),
  ('softcatala-corrector', 'Corrector de Softcatalà', 'Corrector ortogràfic, gramatical i d''estil per a textos en català, amb explicacions dels errors.', null, 'https://www.softcatala.org/corrector/', null, 'Softcatalà', 'https://www.softcatala.org/', 'llengues', array['primaria', 'eso', 'batxillerat', 'fp']::text[], array['ca']::text[], array['ortografia', 'gramàtica', 'escriptura', 'català']::text[], 'publicada', '2026-05-06'::timestamptz, '2026-05-06'::timestamptz),
  ('dlc-iec', 'Diccionari de la llengua catalana', 'Diccionari normatiu de l''Institut d''Estudis Catalans, amb cerca avançada i conjugacions.', null, 'https://dlc.iec.cat/', null, 'Institut d''Estudis Catalans', 'https://www.iec.cat/', 'llengues', array['primaria', 'eso', 'batxillerat', 'fp']::text[], array['ca']::text[], array['diccionari', 'lèxic', 'normativa', 'català']::text[], 'publicada', '2026-05-12'::timestamptz, '2026-05-12'::timestamptz),
  ('toy-theater', 'Toy Theater', 'Jocs i manipulables virtuals per treballar càlcul, lectura i lògica a les primeres edats.', null, 'https://toytheater.com/', null, 'Toy Theater', 'https://toytheater.com/', 'matematiques', array['infantil', 'primaria']::text[], array['en']::text[], array['manipulables', 'càlcul', 'jocs', 'numeració']::text[], 'publicada', '2026-05-27'::timestamptz, '2026-05-27'::timestamptz),
  ('tinkercad', 'Tinkercad', 'Modelatge 3D, circuits amb Arduino i programació per blocs, tot des del navegador.', null, 'https://www.tinkercad.com/', null, 'Autodesk', 'https://www.autodesk.com/', 'tecnologia', array['primaria', 'eso', 'fp']::text[], array['ca', 'es', 'en', 'fr']::text[], array['disseny 3D', 'impressió 3D', 'Arduino', 'robòtica']::text[], 'publicada', '2026-06-08'::timestamptz, '2026-06-08'::timestamptz),
  ('gapminder-tools', 'Gapminder Tools', 'Gràfics animats amb dades mundials de salut, riquesa i població per entendre el món amb dades.', null, 'https://www.gapminder.org/tools/', null, 'Fundació Gapminder', 'https://www.gapminder.org/', 'socials', array['eso', 'batxillerat']::text[], array['en', 'es']::text[], array['dades', 'demografia', 'economia', 'estadística']::text[], 'publicada', '2026-06-19'::timestamptz, '2026-06-19'::timestamptz),
  ('our-world-in-data', 'Our World in Data', 'Gràfics i articles rigorosos sobre els grans reptes globals: clima, salut, pobresa o energia.', null, 'https://ourworldindata.org/', 'https://github.com/owid', 'Global Change Data Lab', 'https://ourworldindata.org/about', 'socials', array['batxillerat', 'fp']::text[], array['en']::text[], array['dades', 'canvi climàtic', 'ODS', 'geografia']::text[], 'publicada', '2026-07-03'::timestamptz, '2026-07-03'::timestamptz),
  ('google-arts-culture', 'Google Arts & Culture', 'Obres d''art en alta resolució, visites virtuals a museus i exposicions temàtiques.', null, 'https://artsandculture.google.com/', null, 'Google Cultural Institute', 'https://artsandculture.google.com/', 'arts', array['primaria', 'eso', 'batxillerat']::text[], array['ca', 'es', 'en', 'fr']::text[], array['història de l''art', 'museus', 'patrimoni']::text[], 'publicada', '2026-07-21'::timestamptz, '2026-07-21'::timestamptz),
  ('classroomscreen', 'Classroomscreen', 'Pantalla d''aula amb temporitzador, semàfor de soroll, sorteig de noms i instruccions de treball.', null, 'https://classroomscreen.com/', null, 'Classroomscreen', 'https://classroomscreen.com/', 'eines', array['infantil', 'primaria', 'eso']::text[], array['ca', 'es', 'en', 'fr']::text[], array['gestió d''aula', 'temporitzador', 'sorteig']::text[], 'publicada', '2026-09-15'::timestamptz, '2026-09-15'::timestamptz)
on conflict (slug) do nothing;

-- Comprovació: hauria de mostrar 19 aplicacions publicades.
select estat, count(*) from public.apps group by estat;
