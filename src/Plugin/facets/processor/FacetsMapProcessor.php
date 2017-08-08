<?php

namespace Drupal\facets_map_widget\Plugin\facets\processor;

use Drupal\facets\FacetInterface;
use Drupal\facets\Processor\BuildProcessorInterface;
use Drupal\facets\Processor\ProcessorPluginBase;

/**
 * Provides a processor that updates 'geom' value dynamically
 *
 * // The stages relate to the implemented stage processor interfaces (so post_query needs to also implement PostQueryProcessorInterface), not needed here.
 *
 * @FacetsProcessor(
 *   id = "facets_map",
 *   label = @Translation("Map Facets"),
 *   description = @Translation("Update 'geom' value by the bounding box value of a map viewport."),
 *   stages = {
 *     "build" = 6
 *   }
 * )
 */
class FacetsMapProcessor extends ProcessorPluginBase implements BuildProcessorInterface {

  /**
   * {@inheritdoc}
   */
  public function build(FacetInterface $facet, array $results) {

    /** @var \Drupal\facets\Result\ResultInterface[] $results */
    foreach ($results as &$result) {
      $url = $result->getUrl();
      $url->setOption('geom', '__GEOM__');
      $result->setUrl($url);
    }

    return $results;
  }
}
