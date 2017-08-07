<?php

namespace Drupal\facets_map_widget\Plugin\facets\widget;

use Drupal\facets\FacetInterface;
use Drupal\facets\Widget\WidgetPluginBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Component\Render\FormattableMarkup;

/**
 * A simple widget class that returns a simple location array of the facet results.
 *
 * @FacetsWidget(
 *   id = "rpt",
 *   label = @Translation("Map showing the clustered map"),
 *   description = @Translation("A configurable widget that builds an location array with results."),
 * )
 */
class RptMapWidget extends WidgetPluginBase {

  /**
   * {@inheritdoc}
   */
  public function getQueryType(array $query_types) {
    return $query_types['rpt'];
  }

  /**
   * {@inheritdoc}
   */
  public function defaultConfiguration() {
    return [
        'display_mode' => FALSE,
      ] + parent::defaultConfiguration();
  }

  /**
   * {@inheritdoc}
   */
  public function buildConfigurationForm(array $form, FormStateInterface $form_state, FacetInterface $facet) {
    $configuration = $this->getConfiguration();

    $form += parent::buildConfigurationForm($form, $form_state, $facet);

    $form['display_mode'] = [
      '#type' => 'radios',
      '#title' => $this->t('Display Mode'),
      '#default_value' => $configuration['display_mode'],
      '#options' => [
        'array'=> $this->t('Display imploded string with location'),
        'heatmap' => $this->t('Display image with heatmap'),
        'webmap' => $this->t('Display faceted webmap'),
      ],
    ];

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function build(FacetInterface $facet) {
    /** @var \Drupal\facets\Result\Result[] $results */
    $results = $facet->getResults();
    switch ($this->getConfiguration()['display_mode']) {
      case 'array':
        $build = [
          '#type' => 'markup',
          '#markup' => implode(',', $results[0]->getRawValue()),
        ];
        break;

      case 'heatmap':
        $img_png = end($results[0]->getRawValue());
        $image = new FormattableMarkup('<img src="data:image/png;base64,:src"/>', [':src' => $img_png]);
        $build = [
          '#type' => 'markup',
          '#markup' => $image,
        ];
        break;

      case 'webmap':
        $build['map'] = [
          '#type' => 'html_tag',
          '#tag' => 'div',
          '#attributes' => [
            'class' => ['facets-map'],
            'id' => $facet->id(),
          ],
        ];
        $build['#attached']['library'][] = 'facets_map_widget/facets_map';
        $build['#attached']['drupalSettings']['facets']['map']['id'] = $facet->id();
        $build['#attached']['drupalSettings']['facets']['map']['results'] = json_encode($results[0]->getRawValue());



        break;
    }
    return $build;
  }

}
