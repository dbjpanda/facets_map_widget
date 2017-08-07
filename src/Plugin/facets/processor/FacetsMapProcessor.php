<?php

namespace Drupal\facets_map_widget\Plugin\facets\processor;

use Drupal\facets\FacetInterface;
use Drupal\facets\Processor\BuildProcessorInterface;
use Drupal\facets\Processor\ProcessorPluginBase;

/**
 * Provides a processor that updates 'geom' value dynamically
 *
 * @FacetsProcessor(
 *   id = "facets_map",
 *   label = @Translation("Map Facets"),
 *   description = @Translation("Update 'geom' value by the bounding box value of a map viewport."),
 *   stages = {
 *     "post_query" = 6,  //confused here 
 *     "build" = 6
 *   }
 * )
 */
class FacetsMapProcessor extends ProcessorPluginBase implements BuildProcessorInterface {

  /**
   * {@inheritdoc}
   */
  public function build(FacetInterface $facet, array $results) {

    return $results;
  }


}
