/**
 * SPARQL query templates for bulk data export
 * These queries are copied from PPDS_queries.py
 */

// Query 1: Basic Notice Details and Legal Basis
export const notice_details_query_part1 = `
PREFIX epo: <http://data.europa.eu/a4g/ontology#>
PREFIX dct: <http://purl.org/dc/terms/>

SELECT DISTINCT ?notice ?procedureID ?noticePublicationDate ?YEAR ?noticeType ?noticeSchema ?legalBasis ?CNIdentifier ?EstimatedValue ?EstimatedValueCurrency
WHERE {
    GRAPH <https://data.europa.eu/a4g/graph/dgGrow> {
        ?notice a epo:ResultNotice.
        ?notice epo:hasPublicationDate ?noticePublicationDate .
        FILTER (YEAR(?noticePublicationDate) = 2024 || YEAR(?noticePublicationDate) = 2023)
        ?notice epo:refersToProcedure ?procedure .

        OPTIONAL {?procedure epo:hasID/epo:hasIdentifierValue ?procedureID . }
        
        OPTIONAL {
            ?procedure epo:hasEstimatedValue ?EstimatedValueProperty .
            ?EstimatedValueProperty epo:hasAmountValue ?EstimatedValue ;
                                                  epo:hasCurrency ?EstimatedValueCurrency .
        }

        OPTIONAL { ?notice epo:hasLegalBasis ?legalBasis . }
        OPTIONAL {
            ?notice epo:refersToPrevious ?prev .
            ?prev epo:hasID ?ID .
            ?ID epo:hasIdentifierValue ?CNIdentifier .
        }
    }

        OPTIONAL { ?notice dct:conformsTo ?noticeType . }
        OPTIONAL { ?notice dct:type ?noticeSchema . }
}
LIMIT {limit}
OFFSET {offset}
`;

// Query 2: Procedure Details and Classification
export const notice_details_query_part2 = `
PREFIX epo: <http://data.europa.eu/a4g/ontology#>
PREFIX dct: <http://purl.org/dc/terms/>

SELECT DISTINCT ?notice ?procedureType ?TYPE_OF_CONTRACT ?CPV ?isJointProcurement ?ProcurementTechniques
WHERE {
  GRAPH <https://data.europa.eu/a4g/graph/dgGrow> {
    ?notice a epo:ResultNotice.
    ?notice epo:hasPublicationDate ?noticePublicationDate .
    FILTER (YEAR(?noticePublicationDate) = 2024 || YEAR(?noticePublicationDate) = 2023)
    ?notice epo:refersToProcedure ?procedure .

    OPTIONAL {
      ?procedure epo:hasProcedureType ?procedureType;
                 epo:foreseesContractSpecificTerm/epo:hasContractNatureType ?TYPE_OF_CONTRACT;
                 epo:isJointProcurement ?isJointProcurement.
    }

    OPTIONAL {
      ?procedure epo:hasPurpose/epo:hasMainClassification ?CPV .
    }

    OPTIONAL {
      ?procedure epo:usesTechnique ?ProcurementTechniques.
    }
  }
}
LIMIT {limit}
OFFSET {offset}
`;

// Buyer details query
export const buyer_details_query = `
PREFIX epo: <http://data.europa.eu/a4g/ontology#>
PREFIX locn: <http://www.w3.org/ns/locn#>

SELECT DISTINCT ?notice ?CAE_NAME ?CAE_NATIONALID ?ISO_COUNTRY_CODE ?buyerNutsCode ?CAE_TYPE ?MAIN_ACTIVITY ?CAE_TOWN ?CAE_POSTAL_CODE ?CAE_ADDRESS
WHERE {
    GRAPH <https://data.europa.eu/a4g/graph/dgGrow> {
        ?notice a epo:ResultNotice.
        ?notice epo:hasPublicationDate ?noticePublicationDate .
        FILTER (YEAR(?noticePublicationDate) = 2024 || YEAR(?noticePublicationDate) = 2023)
        
        ?notice epo:announcesRole ?buyer .
        ?buyer a epo:Buyer .
        ?buyer epo:playedBy ?buyerOrganisation .
        ?buyer epo:isContractingEntity true .
        ?buyerOrganisation epo:hasLegalName ?CAE_NAME    
        OPTIONAL { ?buyerOrganisation epo:hasID/epo:hasIdentifierValue ?CAE_NATIONALID }
        OPTIONAL { ?buyerOrganisation epo:hasBuyerLegalType ?CAE_TYPE }
        OPTIONAL { ?buyerOrganisation epo:hasMainActivity ?MAIN_ACTIVITY }
        
        OPTIONAL {
            ?buyerOrganisation epo:registeredAddress ?orgAddress .
            ?orgAddress epo:hasCountryCode ?ISO_COUNTRY_CODE .
            OPTIONAL { ?orgAddress epo:hasNutsCode ?buyerNutsCode }
            OPTIONAL { ?orgAddress locn:postName ?CAE_TOWN }
            OPTIONAL { ?orgAddress locn:postCode ?CAE_POSTAL_CODE }
            OPTIONAL { ?orgAddress locn:fullAddress ?CAE_ADDRESS }
        }
    }
}
LIMIT {limit}
OFFSET {offset}
`;

// Award details query part 1
export const award_details_query_part1 = `
PREFIX epo: <http://data.europa.eu/a4g/ontology#>
PREFIX ppds-skos: <http://publications.europa.eu/resource/authority/winner-selection-status/>
PREFIX dct: <http://purl.org/dc/terms/>

SELECT DISTINCT ?notice ?AwardValue ?awardCurrency
WHERE {
    GRAPH <https://data.europa.eu/a4g/graph/dgGrow> {
        ?notice a epo:ResultNotice ;
                epo:refersToProcedure ?procedure ;
                epo:hasPublicationDate ?noticePublicationDate ;
                epo:announcesNoticeAwardInformation ?awardInfo .
        
        FILTER (YEAR(?noticePublicationDate) IN (2023, 2024))

        # Award information with optional monetary details
        OPTIONAL {
            ?awardInfo epo:hasTotalAwardedValue ?TotalAwardedValue .
            ?TotalAwardedValue epo:hasAmountValue ?AwardValue ;
                                                  epo:hasCurrency ?awardCurrency .
        }
    }
}
LIMIT {limit}
OFFSET {offset}
`;

// DURATION query
export const contract_duration = `
PREFIX epo: <http://data.europa.eu/a4g/ontology#>
PREFIX time: <http://www.w3.org/2006/time#>
PREFIX dct: <http://purl.org/dc/terms/>

SELECT DISTINCT 
    ?notice ?DURATION ?durationUnit
WHERE {
    GRAPH <https://data.europa.eu/a4g/graph/dgGrow> {
        # Relación entre aviso y procedimiento
        ?notice a epo:CompetitionNotice ;
                epo:hasPublicationDate ?noticePublicationDate ;
                epo:refersToProcedure ?procedure .
        ?procedure epo:hasID/epo:hasIdentifierValue ?procedureID ;
                   epo:hasProcurementScopeDividedIntoLot ?lot .

        ?lot a epo:Lot ;
             epo:foreseesContractSpecificTerm ?contractTerm .

        ?contractTerm a epo:ContractTerm ;
                      epo:definesContractDuration ?specificDuration .
        ?specificDuration a epo:SpecificDuration ;
                          time:numericDuration ?DURATION ;
                          time:unitType ?durationUnit .
    }
}
LIMIT {limit}
OFFSET {offset}
`;
