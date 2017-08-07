<?php

namespace Drupal\facets_map_widget\Plugin\facets\query_type;

use Drupal\facets\QueryType\QueryTypePluginBase;
use Drupal\facets\Result\Result;

/**
 * Provides support for location facets within the Search API scope.
 *
 * This query type supports latitude/longitude data type. This specific
 * implementation of the query type supports a generic solution of adding map facets.
 *
 * @FacetsQueryType(
 *   id = "search_api_rpt",
 *   label = @Translation("Recursive Point Type"),
 * )
 */
class SearchApiRpt extends QueryTypePluginBase {

  /**
   * {@inheritdoc}
   */
  public function execute() {
    $query = $this->query;
    $field_identifier = $this->facet->getFieldIdentifier();

    // Set the options for the actual query.
    $options = &$query->getOptions();

    $options['search_api_facets'][$field_identifier] = [
      'field' => $field_identifier,
      'limit' => $this->facet->getHardLimit(),
      'operator' => $this->facet->getQueryOperator(),
      'min_count' => $this->facet->getMinCount(),
      'missing' => FALSE,
    ];

    $format = 'ints2D';
    if (isset($this->facet->getWidgetInstance()->getConfiguration()['display_mode'])) {
      if ($this->facet->getWidgetInstance()->getConfiguration()['display_mode']=='heatmap') {
        $format = 'png';
      }
    }

    $options['search_api_rpt'][$field_identifier] = [
      'field' => $field_identifier,
      'geom' => '["-180 -90" TO "180 90"]',
      'gridLevel' => '2',
      'maxCells'=> '35554432',
      'distErrPct' => '',
      'distErr' => '',
      'format' => $format
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function build() {

    $query_operator = $this->facet->getQueryOperator();
    if (empty($this->results)) {
      return $this->facet;
    }

    $facet_results = [];
    foreach ($this->results as $key => $result) {
      if ($result['count'] || $query_operator == 'or') {
        $count = $result['count'];
        $result = new Result($result['filter'], "heatmap", $count);
        $facet_results[] = $result;
      }
    }
    $this->facet->setResults($facet_results);
    return $this->facet;
  }

}
