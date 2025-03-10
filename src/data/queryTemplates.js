/**
 * Predefined SPARQL query templates
 */
const queryTemplates = {
  "Select a template": "",
  "Count the number of notices": `
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX epo: <http://data.europa.eu/a4g/ontology#>
PREFIX cccev: <http://data.europa.eu/m8g/>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX locn: <http://www.w3.org/ns/locn#>
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX dc: <http://purl.org/dc/elements/1.1/>
PREFIX euvoc: <http://publications.europa.eu/ontology/euvoc#>

SELECT (COUNT(DISTINCT ?notice) AS ?numberOfNotices)
WHERE {
    ?notice a epo:Notice .
}
`,
  "Count the number of notices per month": `
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX epo: <http://data.europa.eu/a4g/ontology#>
PREFIX cccev: <http://data.europa.eu/m8g/>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX locn: <http://www.w3.org/ns/locn#>
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX dc: <http://purl.org/dc/elements/1.1/>
PREFIX euvoc: <http://publications.europa.eu/ontology/euvoc#>

SELECT ?monthName (COUNT(DISTINCT ?notice) AS ?numberOfNotices)
WHERE {
    ?notice a epo:Notice .


# YEAR AND MONTH
    OPTIONAL {
        ?notice epo:hasDispatchDate ?date .
    }
    BIND(IF(BOUND(?date),year(xsd:date(?date)),"") AS ?year)
    FILTER(?year=2022)
    BIND(IF(BOUND(?date),month(xsd:date(?date)),"") AS ?month)
    BIND(IF(!BOUND(?month), "",
        IF(?month = 1, "January",
        IF(?month = 2, "February",
        IF(?month = 3, "March",
        IF(?month = 4, "April",
        IF(?month = 5, "May",
        IF(?month = 6, "June",
        IF(?month = 7, "July",
        IF(?month = 8, "August",
        IF(?month = 9, "September",
        IF(?month = 10, "October",
        IF(?month = 11, "November", "December")))))))))))) AS ?monthName)
} group by ?monthName
ORDER BY ?monthName
`,
  "Average of bidders per country": `
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX epo: <http://data.europa.eu/a4g/ontology#>
PREFIX cccev: <http://data.europa.eu/m8g/>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX locn: <http://www.w3.org/ns/locn#>
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX dc: <http://purl.org/dc/elements/1.1/>
PREFIX euvoc: <http://publications.europa.eu/ontology/euvoc#>
PREFIX sh: <http://www.w3.org/ns/shacl#>

SELECT DISTINCT ?countryCode (AVG(?tenders)*100/100 AS ?averageBidders)
WHERE {
    # RESULT NOTICE
    ?notice a epo:ResultNotice .
    ?notice epo:hasDispatchDate ?dispatchDate .
    ?notice epo:hasLegalBasis ?legalBasis .

    # PROCEDURE
    ?notice epo:refersToProcedure ?procedure .
    ?procedure epo:hasID [epo:hasIdentifierValue ?procedureIdentifier] .
    ?procedure epo:hasPurpose [epo:hasMainClassification ?cpvCode] .
    ?procedure epo:foreseesContractSpecificTerm [epo:hasContractNatureType ?hasContractNatureType] .

    #Buyer information
    ?notice epo:announcesRole ?buyerRole .
    ?buyerRole a epo:Buyer .
        #epo:isContractingEntity true .
    
    #Country code
    ?buyerRole epo:playedBy [cccev:registeredAddress [ epo:hasCountryCode ?countryCode]] .

    #NUTS code
    OPTIONAL{
        ?buyerRole epo:playedBy [cccev:registeredAddress [ epo:hasNutsCode ?nutsCode ]] .
    }
    

    #Buyer legal type
    OPTIONAL{
        ?buyerRole epo:playedBy [epo:hasBuyerLegalType ?buyerLegalType] .
    }

    #Buyer main activity
    OPTIONAL{
        ?buyerRole epo:playedBy [epo:hasMainActivity ?buyerMainActivity] .
    }

    # LOT
    ?procedure epo:hasProcurementScopeDividedIntoLot ?lot .
    ?lot epo:hasID [epo:hasIdentifierValue ?lotIdentifier] .
      OPTIONAL{
        ?lot epo:hasEstimatedValue ?lotMonetaryValue .
        ?lotMonetaryValue epo:hasCurrency <http://publications.europa.eu/resource/authority/currency/EUR> .
        ?lotMonetaryValue epo:hasAmountValue ?lotEstimatedValue .
    }

    # PROCEDURE TYPE
    OPTIONAL{
        ?procedure epo:hasProcedureType ?procedureType .
    # Exclusive filter for indicator 1: exclude procedures without competition
    FILTER(?procedureType!= <http://publications.europa.eu/resource/authority/procurement-procedure-type/neg-wo-call>)
    }
    # LOT AWARD
    OPTIONAL{
        ?lot ^epo:describesLot ?lotAward.
        OPTIONAL{
            ?lotAward ^epo:summarisesInformationForLotAwardOutcome/epo:hasReceivedTenders ?receivedTenders .
        }
        OPTIONAL{
            ?lotAward ^epo:summarisesInformationForLotAwardOutcome/epo:hasElectronicTenders ?electronicTenders .
        }
        OPTIONAL{
            ?lotAward epo:hasAwardStatus ?awardStatus .
            # General filter: exclude non-awarded lots
            FILTER(?awardStatus != <http://publications.europa.eu/resource/authority/winner-selection-status/clos-nw>)
        }
    }
    # Filter out lots without tenders informed.
    FILTER(BOUND(?receivedTenders) || BOUND(?electronicTenders))
    # Take the number of tenders and if it's not informed, take the number of electronic tenders. Else discard the lot.
    BIND(COALESCE(?receivedTenders, ?electronicTenders) AS ?tenders)
    
    # Exclusive filter for indicator 1: exclude Frameworks Agreements
    {SELECT ?procedure (SUM(?termFrameworkAgreement) AS ?countFrameworkAgreement) 
        WHERE{
            OPTIONAL {
            ?procedure epo:isSubjectToProcedureSpecificTerm ?term .
            ?term a ?termType .
            }
            BIND(IF(BOUND(?termType), IF(?termType!=epo:FrameworkAgreementTerm, 0, 1), 0) as ?termFrameworkAgreement)
        }   
    } 
    FILTER(!BOUND(?countFrameworkAgreement) or ?countFrameworkAgreement=0)
} GROUP BY ?countryCode;

export default queryTemplates;
