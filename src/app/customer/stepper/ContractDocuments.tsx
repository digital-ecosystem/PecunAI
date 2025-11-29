import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function ContractDocuments(
    {
        expandedSections,
        toggleSection,
        agreements,
        handleCheckboxChangeContractDocument,
        handleAcceptAll
    }: {
        expandedSections: {
            vertraege: boolean;
            gebuehren: boolean;
            weitereInfo: boolean;
        };
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
//   const [expandedSections, setExpandedSections] = useState({
//     vertraege: false,
//     gebuehren: false,
//     weitereInfo: false
//   });

//   const [agreements, setAgreements] = useState({
//     acceptAll: false,
//     dataProtection: false,
//     vermoegensverwaltung: false,
//     bankenbedingungen: false,
//     widerruf: false,
//     efsaeg: false,
//     informationen: false,
//     auftraggeber: false,
//     einverstanden: false,
//     disclaimer: false
//   });

//   const toggleSection = (section: keyof typeof expandedSections) => {
//     setExpandedSections(prev => {
//       const isCurrentlyOpen = prev[section];
//       return {
//         vertraege: false,
//         gebuehren: false,
//         weitereInfo: false,
//         [section]: !isCurrentlyOpen
//       };
//     });
//   };

//   const handleCheckboxChangeContractDocument = (field: keyof typeof agreements) => {
//     setAgreements(prev => ({
//       ...prev,
//       [field]: !prev[field]
//     }));
//   };

//   const handleAcceptAll = () => {
//     const newValue = !agreements.acceptAll;
//     setAgreements({
//       acceptAll: newValue,
//       dataProtection: newValue,
//       vermoegensverwaltung: newValue,
//       bankenbedingungen: newValue,
//       widerruf: newValue,
//       efsaeg: newValue,
//       informationen: newValue,
//       auftraggeber: newValue,
//       einverstanden: newValue,
//       disclaimer: newValue
//     });
//   };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 lg:min-h-screen min-h-0">
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Vertragsdokumente</h1>
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
                  <a href="#" className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 hover:bg-gray-50 rounded transition-colors group">
                    <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors break-words">
                      20251117_4Money_Die Plattform Eröffnungsantrag feur Wertpapierdepot 4Money_SWBI0CK844C_7532
                    </span>
                  </a>

                  <a href="#" className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 hover:bg-gray-50 rounded transition-colors group">
                    <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors break-words">
                      20251117_4Money_Deckblatt zusätzliches Ziel_SWBI0CK844C_7532
                    </span>
                  </a>

                  <a href="#" className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 hover:bg-gray-50 rounded transition-colors group">
                    <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors break-words">
                      20251117_4Money_ffoods Vermögensverwaltungsvertrag_SWBI0CK844C_7532
                    </span>
                  </a>

                  <a href="#" className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 hover:bg-gray-50 rounded transition-colors group">
                    <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors break-words">
                      20251117_4Money_4money Setup Fee und Vermittlungsgebühr_SWBI0CK844C_7532
                    </span>
                  </a>

                  <a href="#" className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 hover:bg-gray-50 rounded transition-colors group">
                    <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors break-words">
                      20251117_4Money_4money Servicegebühren_SWBI0CX844C_7532
                    </span>
                  </a>

                  <a href="#" className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 hover:bg-gray-50 rounded transition-colors group">
                    <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors break-words">
                      20251117_4Money_Die Plattform Serviceentgelt für Beraterfirma_SWBI0CK844C_7532
                    </span>
                  </a>
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

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {/* <th className="text-left py-3 px-2 font-semibold text-gray-700"></th> */}
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">Vermögensverwaltung allgemein</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">Liquidität</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-3 px-2 text-gray-700">Kosten und Gebühren (inkl. USt.)</td>
                        <td className="py-3 px-2 text-gray-700">0-%</td>
                        <td className="py-3 px-2 text-gray-700">0€</td>
                        <td className="py-3 px-2 text-gray-700">0-%</td>
                        <td className="py-3 px-2 text-gray-700">0€</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 text-gray-700">Vermögensverwaltungskosten (WPDLU, 4money)</td>
                        <td className="py-3 px-2 text-gray-700">0,29%</td>
                        <td className="py-3 px-2 text-gray-700">29,00</td>
                        <td className="py-3 px-2 text-gray-700">0,29%</td>
                        <td className="py-3 px-2 text-gray-700">29,00</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 text-gray-700">Fondsgebühren (ETFs & sfonds)</td>
                        <td className="py-3 px-2 text-gray-700">0,32%</td>
                        <td className="py-3 px-2 text-gray-700">32,00</td>
                        <td className="py-3 px-2 text-gray-700">0,24%</td>
                        <td className="py-3 px-2 text-gray-700">24,00</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 text-gray-700">Erfolgsgebühren p.a. (die Plattform)</td>
                        <td className="py-3 px-2 text-gray-700">0,37%</td>
                        <td className="py-3 px-2 text-gray-700">37,00</td>
                        <td className="py-3 px-2 text-gray-700">0,37%</td>
                        <td className="py-3 px-2 text-gray-700">37,00</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 text-gray-700">Erfolgsgebühren p.a. (firmengeben, 4money)</td>
                        <td className="py-3 px-2 text-gray-700">1,11%</td>
                        <td className="py-3 px-2 text-gray-700">111,00</td>
                        <td className="py-3 px-2 text-gray-700">0,02%</td>
                        <td className="py-3 px-2 text-gray-700">42,00</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 text-gray-700">Produktkosten p.a.</td>
                        <td className="py-3 px-2 text-gray-700">0,37%</td>
                        <td className="py-3 px-2 text-gray-700">37,00</td>
                        <td className="py-3 px-2 text-gray-700">0,12%</td>
                        <td className="py-3 px-2 text-gray-700">12,00</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 text-gray-700">Transaktionskosten p.a.</td>
                        <td className="py-3 px-2 text-gray-700">0,05%</td>
                        <td className="py-3 px-2 text-gray-700">5,00</td>
                        <td className="py-3 px-2 text-gray-700">0,05%</td>
                        <td className="py-3 px-2 text-gray-700">5,00</td>
                      </tr>
                      <tr className="font-semibold bg-gray-50">
                        <td className="py-3 px-2 text-gray-900">Summe Gesamtkostenquote (p.a.)</td>
                        <td className="py-3 px-2 text-gray-900">2,09%</td>
                        <td className="py-3 px-2 text-gray-900">209,00</td>
                        <td className="py-3 px-2 text-gray-900">1,38%</td>
                        <td className="py-3 px-2 text-gray-900">138,00</td>
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
                <a href="#" className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 hover:bg-gray-50 rounded transition-colors group">
                  <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors break-words">
                    ffoods Allgemeine Informationsbroschüren
                  </span>
                </a>
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
          <label className="flex flex-col sm:flex-row items-start gap-3 cursor-pointer group">
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
          <label className="flex flex-col sm:flex-row items-start gap-3 cursor-pointer group">
            <input 
              type="checkbox"
              checked={agreements.dataProtection}
              onChange={() => handleCheckboxChangeContractDocument('dataProtection')}
              className="w-5 h-5 text-teal-600 rounded mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed break-words">
              Ich erkläre, dass ich mit der gesetzeskonformen Datenverarbeitung gemäß Datenschutz-Grundverordnung zur 
              Inanspruchnahme und Abwicklung von ffoods (Asset Management by ffoods GmbH), 4money (4money Financial Services 
              GmbH) und der Partnerbank Die Plattform (Schelhammer Capital Bank AG) einverstanden bin.
            </span>
          </label>

          {/* Vermögensverwaltung */}
          <label className="flex flex-col sm:flex-row items-start gap-3 cursor-pointer group">
            <input 
              type="checkbox"
              checked={agreements.vermoegensverwaltung}
              onChange={() => handleCheckboxChangeContractDocument('vermoegensverwaltung')}
              className="w-5 h-5 text-teal-600 rounded mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed break-words">
              Ich beauftrage ffoods (Asset Management by ffoods GmbH) hiermit mit der Vermögensverwaltung und 
              erteile dieser gegenüber der Partnerbank Die Plattform (Schelhammer Capital Bank AG) eine 
              Verwaltungsvollmacht.
            </span>
          </label>

          {/* Bankenbedingungen */}
          <label className="flex flex-col sm:flex-row items-start gap-3 cursor-pointer group">
            <input 
              type="checkbox"
              checked={agreements.bankenbedingungen}
              onChange={() => handleCheckboxChangeContractDocument('bankenbedingungen')}
              className="w-5 h-5 text-teal-600 rounded mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed break-words">
              Ich entnehme darüber hinaus die Partnerbank Die Plattform ( Schelhammer Capital Bank AG) vom 
              Bankgeheimnis gemäß §38 Abs. 2 Ziff BWG.
            </span>
          </label>

          {/* Widerruf */}
          <label className="flex flex-col sm:flex-row items-start gap-3 cursor-pointer group">
            <input 
              type="checkbox"
              checked={agreements.widerruf}
              onChange={() => handleCheckboxChangeContractDocument('widerruf')}
              className="w-5 h-5 text-teal-600 rounded mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed break-words">
              Ich erteile meine widerrufliche Zustimmung, dass sämtliche mich betreffenden Daten, die mit dieser 
              Geschäftsverbindung im Zusammenhang stehen, auch mit der Partnerbank Die Plattform (Schelhammer 
              Capital Bank AG) geteilt werden können.
            </span>
          </label>

          {/* Einverständnis */}
          <label className="flex flex-col sm:flex-row items-start gap-3 cursor-pointer group">
            <input 
              type="checkbox"
              checked={agreements.einverstanden}
              onChange={() => handleCheckboxChangeContractDocument('einverstanden')}
              className="w-5 h-5 text-teal-600 rounded mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed break-words">
              Ich bin einverstanden, dass ich in Zukunft alle Informationen von ffoods (Asset Management by ffoods 
              GmbH), 4money (4money Financial Services GmbH) und persönlich an mich gerichtete Informationen 
              und Mitteilungen bezüglich der Partnerbank Die Plattform (Schelhammer Capital Bank AG) auf 
              elektronischem Weg oder im Onlinebanking erhalten werde. Auch die die Geheimhaltung sowie nicht 
              öffentlicher Informationen.
            </span>
          </label>

          {/* EFSAEG */}
          <label className="flex flex-col sm:flex-row items-start gap-3 cursor-pointer group">
            <input 
              type="checkbox"
              checked={agreements.efsaeg}
              onChange={() => handleCheckboxChangeContractDocument('efsaeg')}
              className="w-5 h-5 text-teal-600 rounded mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed break-words">
              Ich hab die Informationen zum Einlagensicherungs- und Anlegerentschädigungsgesetz (ESAEG) der 
              Partnerbank Die Plattform (Schelhammer Capital Bank AG) erhalten.
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
              Ich habe alle relevanten Dokumente von ffoods (Asset Management by ffoods GmbH), 4money (4money 
              Financial Services GmbH) und der Partnerbank Die Plattform (Schelhammer Capital Bank AG) inklusiv 
              dem gültigen Konditionsblatt erhalten, vollständig gelesen und erkläre mich hiermit ausdrücklich damit 
              einverstanden.
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
              Der Auftraggeber stimmt hiermit zu, dass die ffoods alle betreffenden Daten aus der Geschäftsverbindung 
              an 4money (4money Financial Services GmbH) sowie weitere Gesellschaften des 4money Konzerns zum 
              Verzinsung (Performance, Asset Allocation), gegenüber der 4money zum Zweck der Erbringung von 
              eigenen Wertpapierdienstleistungen (Anlageberatung) durch 4money öffentlich und einfachen ffoods 
              insoweit von der Verschweigenheitspflicht nach § 8 Abs. 1 WAG 2018.
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
              Rücknahmerecht: Ich erteile gemäß §5 Abs. 4 FernFinG ausdrücklich meine Zustimmung, dass mit der 
              Erfüllung der Verträge vor Ablauf der 14 tägigen Rücktrittsfrist begonnen wird.
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
    </div>
  );
}