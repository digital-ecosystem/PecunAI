'use client';

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import PDFModal from '@/components/PDFModal';


export default function ContractDocuments(
  {
    expandedSections,
    toggleSection,
    agreements,
    handleCheckboxChangeContractDocument,
    handleAcceptAll,
    sessionId,
  }: {
    expandedSections: {
      vertraege: boolean;
      gebuehren: boolean;
      weitereInfo: boolean;
    };
    sessionId: string;
    toggleSection: (section: keyof {
      vertraege: boolean;
      gebuehren: boolean;
      weitereInfo: boolean;
    }) => void;
    agreements: {
      acceptAll: boolean;
      dataProtection: boolean;
      vermoegensverwaltung: boolean;
      bankenbedingungen: boolean;
      widerruf: boolean;
      efsaeg: boolean;
      informationen: boolean;
      auftraggeber: boolean;
      einverstanden: boolean;
      disclaimer: boolean;
    };
    handleCheckboxChangeContractDocument: (field: keyof {
      acceptAll: boolean;
      dataProtection: boolean;
      vermoegensverwaltung: boolean;
      bankenbedingungen: boolean;
      widerruf: boolean;
      efsaeg: boolean;
      informationen: boolean;
      auftraggeber: boolean;
      einverstanden: boolean;
      disclaimer: boolean;
    }) => void;
    handleAcceptAll: () => void;
  }
) {
  const [selectedPDF, setSelectedPDF] = useState<{ url: string; fileName: string } | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  const openPDF = (fileName: string) => {
    const pdfUrl = `/api/documents/${sessionId}/contract-document/${fileName}`;
    setSelectedPDF({ url: pdfUrl, fileName });
  };

  const closePDF = () => {
    setSelectedPDF(null);
  };

  const handleMergePDFs = async () => {
    setIsMerging(true);
    try {
      const response = await fetch('/api/documents/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to merge PDFs');
      }

      const fileName = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'merged-contracts.pdf';

      // Get the merged PDF blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Open in modal
      setSelectedPDF({
        url,
        fileName: fileName.replace(/"/g, ''),
      });
    } catch (error) {
      console.error('❌ Error merging PDFs:', error);
      alert('Failed to merge PDFs. Please try again.');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 lg:min-h-screen min-h-0">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Vertragsdokumente</h1>
          <button
            onClick={handleMergePDFs}
            disabled={isMerging}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
          >
            {isMerging ? 'Vertrag Exportieren...' : 'Vertrag Exportieren'}
          </button>
        </div>
        <p className="text-sm sm:text-base text-gray-600 mb-6">
          Akzeptiere die Vertragsbedingungen, um deine Depoteröffnung im nächsten Schritt mit einem
          digitalen Signaturprozess abzuschließen.
        </p>

        {/* Expandable Sections */}
        <div className="space-y-2">
          <div>
            <button
              onClick={() => toggleSection('vertraege')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-gray-900">Verträge</span>
              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.vertraege ? 'rotate-90' : ''}`} />
            </button>
            {expandedSections.vertraege && (
              <div className="p-4 bg-white mt-1 rounded-lg border border-gray-200">
                <div className="space-y-3">
                  {/* Depoteröffnungsantrag */}
                  <button
                    onClick={() => openPDF('Depoteröffnungsantrag.pdf')}
                    className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 hover:bg-gray-50 rounded transition-colors group text-left"
                  >
                    <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors break-words">
                      Depoteröffnungsantrag
                    </span>
                  </button>
                  {/* Deckblatt Vertragspaket */}
                  <button
                    onClick={() => openPDF('Deckblatt_Vertragspaket.pdf')}
                    className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 hover:bg-gray-50 rounded transition-colors group text-left"
                  >
                    <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors break-words">
                      Deckblatt Vertragspaket
                    </span>
                  </button>
                  {/* Vermögensverwaltungsvertrag */}
                  <button
                    onClick={() => openPDF('Vermögensverwaltungsvertrag.pdf')}
                    className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 hover:bg-gray-50 rounded transition-colors group text-left"
                  >
                    <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors break-words">
                      Vermögensverwaltungsvertrag
                    </span>
                  </button>
                  {/* Vermittlungsgebühr */}
                  <button
                    onClick={() => openPDF('Vermittlungsgebühr.pdf')}
                    className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 hover:bg-gray-50 rounded transition-colors group text-left"
                  >
                    <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors break-words">
                      Vermittlungsgebühr
                    </span>
                  </button>
                  {/* Servicegebühren */}
                  <button
                    onClick={() => openPDF('Servicegebühr.pdf')}
                    className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 hover:bg-gray-50 rounded transition-colors group text-left"
                  >
                    <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors break-words">
                      Servicegebühren
                    </span>
                  </button>
                  {/* Serviceentgelt */}
                  <button
                    onClick={() => openPDF('Serviceentgelt.pdf')}
                    className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 hover:bg-gray-50 rounded transition-colors group text-left"
                  >
                    <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors break-words">
                      Serviceentgelt
                    </span>
                  </button>
                  {/* 4money Protokoll */}
                  <button
                    onClick={() => openPDF('4money_protokoll_PecunAI_v.pdf')}
                    className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 hover:bg-gray-50 rounded transition-colors group text-left"
                  >
                    <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors break-words">
                      4money Protokoll
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              onClick={() => toggleSection('gebuehren')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-gray-900">Gebühren</span>
              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.gebuehren ? 'rotate-90' : ''}`} />
            </button>
            {expandedSections.gebuehren && (
              <div className="p-4 bg-white mt-1 rounded-lg border border-gray-200">
                <p className="text-sm sm:text-base text-gray-600 mb-4">
                  Im Folgenden werden die relevanten Kosten und Gebühren dargestellt. Nähere Details befinden sich außerdem auf dem Konditionsblatt der Partnerbank und in den Produktunterlagen des Fonds.
                </p>

                <p>
                  <strong>
                    Beispielrechnung der Kosten bei einer Einmalzahlung von 10.000 €
                  </strong>
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 font-semibold text-gray-700"></th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700" colSpan={2}>Vermögensverwaltung allgemein</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700" colSpan={2}>Liquidität</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-3 px-2 text-gray-700">Kosten und Gebühren (inkl. USt.)</td>
                        <td className="py-3 px-2 text-gray-700">in %</td>
                        <td className="py-3 px-2 text-gray-700">in €</td>
                        <td className="py-3 px-2 text-gray-700">in %</td>
                        <td className="py-3 px-2 text-gray-700">in €</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 text-gray-700">Einstiegskosten (4money)</td>
                        <td className="py-3 px-2 text-gray-700">3,00 %</td>
                        <td className="py-3 px-2 text-gray-700">300 €</td>
                        <td className="py-3 px-2 text-gray-700">0,00 %</td>
                        <td className="py-3 px-2 text-gray-700">0 €</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 text-gray-700">Vermögensverwaltungsgebühr p.a. (froots)</td>
                        <td className="py-3 px-2 text-gray-700">0,39 %</td>
                        <td className="py-3 px-2 text-gray-700">39 €</td>
                        <td className="py-3 px-2 text-gray-700">0,24 %</td>
                        <td className="py-3 px-2 text-gray-700">24 €</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 text-gray-700">Depot- & Kontoführungsgebühren p.a. (die Plattform)</td>
                        <td className="py-3 px-2 text-gray-700">0,37 %</td>
                        <td className="py-3 px-2 text-gray-700">37 €</td>
                        <td className="py-3 px-2 text-gray-700">0,37 %</td>
                        <td className="py-3 px-2 text-gray-700">37 €</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 text-gray-700">Beratungshonorar p.a. (Servicegebühr 4money)</td>
                        <td className="py-3 px-2 text-gray-700">1,11 %</td>
                        <td className="py-3 px-2 text-gray-700">111 €</td>
                        <td className="py-3 px-2 text-gray-700">0,60 %</td>
                        <td className="py-3 px-2 text-gray-700">60 €</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 text-gray-700">Produktkosten p.a.</td>
                        <td className="py-3 px-2 text-gray-700">0,17 %</td>
                        <td className="py-3 px-2 text-gray-700">17 €</td>
                        <td className="py-3 px-2 text-gray-700">0,12 %</td>
                        <td className="py-3 px-2 text-gray-700">12 €</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 text-gray-700">Transaktionskosten p.a.</td>
                        <td className="py-3 px-2 text-gray-700">0,05 %</td>
                        <td className="py-3 px-2 text-gray-700">5 €</td>
                        <td className="py-3 px-2 text-gray-700">0,05 %</td>
                        <td className="py-3 px-2 text-gray-700">5 €</td>
                      </tr>
                      <tr className="font-semibold bg-gray-50">
                        <td className="py-3 px-2 text-gray-900">Summe Gesamtkostenquote (p.a.)</td>
                        <td className="py-3 px-2 text-gray-900">
                          5,09 %
                        </td>
                        <td className="py-3 px-2 text-gray-900">509 €</td>
                        <td className="py-3 px-2 text-gray-900">1,38 %</td>
                        <td className="py-3 px-2 text-gray-900">138 €</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              onClick={() => toggleSection('weitereInfo')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-gray-900">Weitere Informationen</span>
              <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.weitereInfo ? 'rotate-90' : ''}`} />
            </button>
            {expandedSections.weitereInfo && (
              <div className="p-4 bg-white mt-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => openPDF('Froots_Allgemeine_Informationsbroschüren.pdf')}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 hover:bg-gray-50 rounded transition-colors group">
                  <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors break-words">
                    Froots Allgemeine Informationsbroschüren
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contract Conditions Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Vertragsbedingungen</h2>

        <div className="space-y-4">
          {/* Accept All */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements.acceptAll}
              onChange={handleAcceptAll}
              className="w-5 h-5 text-teal-600 rounded mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm font-semibold text-gray-900 group-hover:text-teal-600 transition-colors break-words">
              Alles akzeptieren
            </span>
          </label>

          {/* Data Protection */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements.dataProtection}
              onChange={() => handleCheckboxChangeContractDocument('dataProtection')}
              className="w-5 h-5 text-teal-600 rounded mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed break-words">
              Ich erkläre, dass ich mit der gesetzeskonformen Datenverarbeitung gemäß Datenschutz – Grundverordnung und 
              den Vertragsbedingungen von froots (Asset Management by froots GmbH), 4money (4money Financial Services GmbH) und
              der Partnerbank Die Plattform (Schelhammer Capital Bank AG) einverstanden bin.
            </span>
          </label>

          {/* Vermögensverwaltung */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements.vermoegensverwaltung}
              onChange={() => handleCheckboxChangeContractDocument('vermoegensverwaltung')}
              className="w-5 h-5 text-teal-600 rounded mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed break-words">
              Ich beauftrage froots (Asset Management by froots GmbH) hiermit mit der Vermögensverwaltung und 
              erteile dieser gegenüber der Partnerbank 
              Die Plattform (Schelhammer Capital Bank AG) eine Verwaltungsvollmacht.
            </span>
          </label>

          {/* Bankenbedingungen */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements.bankenbedingungen}
              onChange={() => handleCheckboxChangeContractDocument('bankenbedingungen')}
              className="w-5 h-5 text-teal-600 rounded mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed break-words">
              Ich entbinde darüber hinaus die Partnerbank Die Plattform 
              ( Schelhammer Capital Bank AG) vom Bankengeheimnis gemäß §38 Abs. 2 Z5 BWG.
            </span>
          </label>

          {/* Widerruf */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements.widerruf}
              onChange={() => handleCheckboxChangeContractDocument('widerruf')}
              className="w-5 h-5 text-teal-600 rounded mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed break-words">
              Ich erteile meine widerrufliche Zustimmung, dass sämtliche mich betreffenden Daten, 
              die mit dieser Geschäftsverbindung in Zusammenhang stehen, 
              auch mit der Partnerbank Die Plattform (Schelhammer Capital Bank AG) geteilt werden können.
            </span>
          </label>

          {/* Disclaimer */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements.disclaimer}
              onChange={() => handleCheckboxChangeContractDocument('disclaimer')}
              className="w-5 h-5 text-teal-600 rounded mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed">
              Rücktrittsrecht: Ich erteile gemäß §8 Abs. 5 FernFinG ausdrücklich meine Zustimmung, dass mit der Erfüllung 
              der Verträge bereits vor Ablauf der 14-tägigen Rücktrittsfrist begonnen wird.
            </span>
          </label>

          {/* Einverständnis */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements.einverstanden}
              onChange={() => handleCheckboxChangeContractDocument('einverstanden')}
              className="w-5 h-5 text-teal-600 rounded mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed break-words">
              Ich bin einverstanden, dass ich in Zukunft alle Informationen von froots 
              (Asset Management by froots GmbH), 4money (4money Financial Services GmbH) und 
              persönlich an mich gerichtete Informationen nach WAG und Mitteilungen der Partnerbank Die Plattform 
              (Schelhammer Capital Bank AG) auf elektronischem Weg oder per Onlinezugang erhalte und verstehe, 
              dass ich die Dienstleistung sonst nicht in Anspruch nehmen kann.
            </span>
          </label>

          {/* EFSAEG */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements.efsaeg}
              onChange={() => handleCheckboxChangeContractDocument('efsaeg')}
              className="w-5 h-5 text-teal-600 rounded mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed break-words">
              Ich hab die Informationen zum Einlagensicherungs- und Anlegerentschädigungsgesetz
              (ESAEG) der Partnerbank Die Plattform (Schelhammer Capital Bank AG) erhalten.
            </span>
          </label>

          {/* Informationen */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements.informationen}
              onChange={() => handleCheckboxChangeContractDocument('informationen')}
              className="w-5 h-5 text-teal-600 rounded mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed">
              Ich habe alle relevanten Dokumente von froots (Asset Management by froots GmbH),
               4money (4money Financial Services GmbH) und 
               der Partnerbank Die Plattform (Schelhammer Capital Bank AG) 
              inklusive dem gültigen Konditionsblatt erhalten, vollständig gelesen und erkläre mich hiermit ausdrücklich damit einverstanden.
            </span>
          </label>

          {/* Auftraggeber */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements.auftraggeber}
              onChange={() => handleCheckboxChangeContractDocument('auftraggeber')}
              className="w-5 h-5 text-teal-600 rounded mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed">
              Der Auftraggeber stimmt hiermit zu, dass die froots alle betreffenden Daten aus der Geschäftsverbindung mit froots, 
              die im Zusammenhang mit der Portfolioverwaltung stehen, wie etwa Informationen zur Veranlagung 
              (Performance, Asset-Allocation), gegenüber der 4money zum Zweck der Erbringung von eigenen 
              Wertpapierdienstleistungen (Anlageberatung) durch 4money offenlegt und entbindet froots insoweit von 
              der Verschwiegenheitspflicht nach § 8 Abs 1 WAG 2018.
            </span>
          </label>

        </div>

        {/* Navigation Buttons */}
        {/* <div className="flex justify-between mt-8">
          <button className="flex items-center gap-2 px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span className="font-medium">Zurück</span>
          </button>
          <button className="flex items-center gap-2 px-6 py-3 text-white bg-teal-500 rounded-full hover:bg-teal-600 transition-colors">
            <span className="font-medium">Weiter</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div> */}
      </div>

      {/* PDF Modal */}
      {selectedPDF && (
        <PDFModal
          isOpen={!!selectedPDF}
          pdfUrl={selectedPDF.url}
          fileName={selectedPDF.fileName}
          onClose={closePDF}
        />
      )}
    </div>
  );
}