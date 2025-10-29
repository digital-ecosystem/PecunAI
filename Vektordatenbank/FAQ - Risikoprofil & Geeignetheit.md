# FAQ – Risikoprofil & Geeignetheit

> **Kontext:** Dieses Kapitel behandelt alle Fragen, die Kund:innen beim Erstellen des Anleger:innenprofils oder bei der Risikoeinstufung typischerweise stellen.  
> Es basiert auf den rechtlichen Vorgaben des WAG 2018 (§ 25), den 4money-Dokumenten „Anleger:innenprofil“ (V 2.4) und „PecunAI v1“, sowie den realen Beratungstranskripten.

---

## 1. Warum muss ich so viele Fragen beantworten?

Damit wir dich richtig beraten können.  
Das Gesetz verpflichtet uns, vor jeder Empfehlung genau zu verstehen:

- welche Ziele du mit deiner Veranlagung verfolgst,  
- wie hoch dein Einkommen und deine Vermögenslage sind,  
- wie viel Risiko du tragen kannst und möchtest,  
- welche Erfahrungen du mit Finanzinstrumenten hast.

Nur so können wir sicherstellen, dass die vorgeschlagenen Produkte **geeignet** und **angemessen** für dich sind.  
Ohne diese Informationen dürfen wir **keine Empfehlung** aussprechen.

> *Fachhinweis:* Die Geeignetheitsprüfung nach § 25 WAG 2018 verlangt die Erhebung von Kenntnissen, Erfahrungen, finanziellen Verhältnissen, Anlagezielen, Risikoneigung und Nachhaltigkeitspräferenzen.

---

## 2. Was passiert, wenn ich Fragen nicht beantworten will?

Dann ist eine korrekte Beratung leider **nicht möglich**.  
Wenn du z. B. keine Angaben zu deinen Finanzen oder Erfahrungen machen willst, gilt ein **Empfehlungsverbot**.  
Du könntest zwar trotzdem investieren („auf eigenen Wunsch“), aber **auf eigenes Risiko** – und das wird im Protokoll ausdrücklich vermerkt.

> **Bot-Hinweis:**  
> In diesem Fall muss der digitale Assistent automatisch den Warnhinweis ausspielen:  
> *„Ohne diese Angaben kann keine geeignete Beratung erfolgen. Die Zeichnung erfolgt auf eigenes Risiko.“*  
> und den Vorgang kennzeichnen (`refusalFlag = true`).

---

## 3. Wie entsteht mein Risikoprofil?

Dein Risikoprofil ergibt sich aus der Kombination folgender Faktoren:

| Bereich | Inhalt |
|----------|--------|
| **Risikoneigung** | Wie du selbst Risiko wahrnimmst (z. B. konservativ, defensiv, chancenorientiert, risikobewusst, risikofreudig). |
| **Finanzielle Verhältnisse** | Einkommen, Ausgaben, Vermögen und Schulden – daraus wird die **Verlusttragfähigkeit** berechnet. |
| **Kenntnisse & Erfahrungen** | Wie vertraut du mit Produkten wie Aktien, Anleihen, Fonds oder ETFs bist. |
| **Anlagehorizont & Ziele** | Wie lange du dein Geld anlegen möchtest und wofür (z. B. Altersvorsorge, Vermögensaufbau). |

Diese Angaben werden miteinander verrechnet und ergeben eine **Risikokategorie** (SRI 1–7).  
Je höher der Wert, desto stärker können die Kursschwankungen deiner Veranlagung ausfallen.

---

## 4. Was bedeutet „SRI“ genau?

„SRI“ steht für **Summary Risk Indicator** – eine europaweit einheitliche Skala von 1 bis 7,  
die das Gesamtrisiko eines Finanzinstruments beschreibt.

| SRI-Stufe | Bedeutung | Typische Produkte |
|------------|------------|------------------|
| **1–2** | sehr geringes Risiko | Geldmarkt- und Anleihenfonds |
| **3–4** | mittleres Risiko | Misch- oder ausgewogene Fonds |
| **5–6** | erhöhtes Risiko | Aktienfonds, dynamische Strategien |
| **7** | sehr hohes Risiko | Einzelaktien, Derivate, spekulative Produkte |

> *Fachhinweis:* Laut Anleger:innenprofil sollen Anlagen mit höherem Risiko (SRI 4–7) je nach Risikoneigung nur in begrenztem Umfang eingesetzt werden (z. B. max. 20 %, 50 % oder 75 % des Depotwerts).

---

## 5. Wie finde ich heraus, wie viel Risiko ich tragen kann?

Der digitale Assistent berechnet das automatisch:  
Aus Einkommen – Ausgaben = frei verfügbares Einkommen und aus Vermögen – Verbindlichkeiten = Nettovermögen.  
Daraus wird eine **Verlusttragfähigkeit** abgeleitet – also der maximale Verlust, den du finanziell verkraften könntest, ohne deine Lebensführung zu gefährden.

> *Beispiel:*  
> Freies Einkommen = 800 €/Monat, Nettovermögen = 30 000 €.  
> Daraus ergibt sich eine moderate Verlusttragfähigkeit und eine eher **defensive** Empfehlung.

---

## 6. Was bedeutet „Geeignetheitsprüfung“?

Die Geeignetheitsprüfung vergleicht dein Profil mit den Merkmalen eines Produkts.  
Empfohlen wird nur, was zu **Zielen, Risiko, Kenntnissen und finanzieller Lage** passt.  
Wenn ein Produkt nicht passt, darf es **nicht empfohlen** werden.  
Nach dem Gespräch erhältst du eine **Geeignetheitserklärung**, in der die Gründe für die Empfehlung festgehalten sind.

---

## 7. Kann sich mein Risikoprofil später ändern?

Ja. Änderungen deiner Lebensumstände – z. B. Einkommen, Familie, Anlageziele – können dein Profil beeinflussen.  
Du kannst es **jederzeit aktualisieren**.  
Empfohlen ist mindestens einmal jährlich eine Überprüfung, um sicherzustellen, dass die Veranlagung weiterhin zu dir passt.

---

## 8. Wie wird mit fehlender Erfahrung umgegangen?

Wenn du bei einer Produktkategorie „keine Erfahrung“ angibst,  
erklärt dir der Assistent die wichtigsten Eigenschaften und Risiken in einfacher Sprache, bevor er weitergeht.  
Das ist gesetzlich vorgeschrieben, um sicherzustellen, dass du verstehst, was du kaufst.

> *Bot-Hinweis:*  
> Bei `experience[asset] = none` muss der LLM-Layer automatisch die jeweilige Aufklärung starten  
> (z. B. „Aktienfonds investieren in viele Unternehmen gleichzeitig … “).  
> Erst nach Bestätigung darf der nächste Schritt erfolgen.

---

## 9. Was passiert, wenn der Markt stark fällt?

Kurzfristige Verluste sind normal und kein Grund zur Panik.  
Wichtig ist, dass dein Portfolio zu deinem Zeithorizont passt.  
Bei langen Laufzeiten gleichen sich Marktschwankungen in der Regel wieder aus.  
Deshalb legen wir gemeinsam ein **strategisches Risikoniveau** fest, das du auch in turbulenten Phasen aushalten kannst.

> *Beispiel:*  
> In einem Fall verlor der Weltaktienmarkt –15 %,  
> das dynamische Portfolio nur –10 % – weil es breiter gestreut und bewertungsorientiert gesteuert war.

---

## 10. Wie oft wird mein Portfolio überprüft?

4money bietet keine automatische laufende Überwachungspflicht an (§ WAG 2018).  
Du kannst jedoch einmal pro Jahr **kostenlos** eine Geeignetheits-Nachprüfung anfordern.  
Wenn du eine Vermögensverwaltung nutzt (z. B. froots),  
überwacht diese dein Portfolio laufend und passt es nach definierten Regeln an.

---

## 11. Was bedeutet „konservativ“, „defensiv“, „chancenorientiert“ …?

Diese Begriffe beschreiben die **Risikoneigung**:

| Kategorie | Beschreibung |
|------------|---------------|
| **Konservativ** | stabile Entwicklung, sehr geringes Verlustrisiko |
| **Defensiv** | geringe Kursschwankungen, etwas höhere Renditechance |
| **Ausgewogen / Chancenorientiert** | Gleichgewicht zwischen Risiko und Ertrag |
| **Risikobewusst** | hohe Renditechance bei spürbaren Schwankungen |
| **Risikofreudig** | sehr hohe Ertragserwartung, starkes Verlustrisiko bis Totalverlust |

---

## 12. Wie lange sollte ich investieren?

Je höher das Risiko, desto länger sollte der Anlagehorizont sein.  
Bei Aktien oder dynamischen Strategien gilt: mindestens **5–10 Jahre**.  
Für sicherheitsorientierte Fonds reichen oft **3 Jahre**.  
Das Ziel ist, Marktschwankungen auszusitzen und den Zinseszinseffekt wirken zu lassen.

---

## 13. Kann ich mein Risikoprofil selbst ändern?

Ja. Wenn du künftig mehr oder weniger Risiko möchtest,  
kannst du dein Profil jederzeit anpassen.  
Eine Erhöhung (z. B. von „defensiv“ auf „chancenorientiert“)  
setzt jedoch eine neue Geeignetheitsprüfung voraus, weil sich dadurch die Produktauswahl ändert.

---

## 14. Was bedeutet „verlusttragfähig“ genau?

„Verlusttragfähigkeit“ beschreibt, wie viel Verlust du finanziell verkraften kannst,  
ohne deine Lebensführung oder Verpflichtungen zu gefährden.  
Sie wird individuell berechnet und bestimmt, ob ein Produkt als geeignet gilt.  
Fehlt diese Information, darf kein Vorschlag erstellt werden.

---

## 15. Warum wird das Gespräch aufgezeichnet?

Zur **Dokumentations- und Beweissicherung** (§ WAG 2018, ESMA-Guideline).  
Die Aufzeichnung dient deinem Schutz – sie stellt sicher, dass alle Pflichtinformationen korrekt vermittelt wurden.  
Die Datei wird sicher gespeichert und nur für gesetzliche Nachweispflichten verwendet (mind. 5 Jahre Speicherung).

---

> **Zusammenfassung:**  
> Das Risikoprofil ist das Herzstück deiner Anlageberatung.  
> Es sorgt dafür, dass du verstehst, worin du investierst,  
> und dass die empfohlenen Produkte zu dir, deinem Einkommen, deinem Zeithorizont und deiner Risikobereitschaft passen.

---
