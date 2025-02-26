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
  "Count the number of notices and sum the procurement value per month": `
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

SELECT ?monthName (ROUND(SUM(?procValue) * 100) / 100 AS ?totalProcurementValueRounded) (COUNT(DISTINCT ?notice) AS ?numberOfNotices)
WHERE {
    ?notice a epo:CompetitionNotice .
    ?notice epo:refersToProcedure ?procedure .
    OPTIONAL {
        ?procedure epo:hasEstimatedValue ?procMonetaryValue .
        ?procMonetaryValue epo:hasCurrency ?currencyTypeProcEstimatedValue .
        FILTER(?currencyTypeProcEstimatedValue = <http://publications.europa.eu/resource/authority/currency/EUR>)
        ?procMonetaryValue epo:hasAmountValue ?procValue .
    }
    OPTIONAL {
        ?notice epo:hasDispatchDate ?date .
    }
    BIND(IF(BOUND(?date), year(xsd:date(?date)), "") AS ?year)
    FILTER(?year = 2022)
    BIND(IF(BOUND(?date), month(xsd:date(?date)), "") AS ?month)
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
} GROUP BY ?monthName
ORDER BY ?monthName
`
};

export default queryTemplates;
