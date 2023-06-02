<?php
namespace OCA\Nmcsharing\Controller;

use OCP\IRequest;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Controller;

class PageController extends Controller {
	private $userId;

	public function __construct($AppName, IRequest $request, $UserId){
		parent::__construct($AppName, $request);
		$this->userId = $UserId;
	}

	/**
	 * @NoCSRFRequired
	 */
	public function index(): TemplateResponse {
		\OCP\Util::addStyle('nmc_sharing', 'style');
		\OCP\Util::addScript('nmc_sharing', 'main', 'theming');
		$response = new TemplateResponse('nmc_sharing', 'index', [
			'id-app-content' => '#app-nmc_sharing',
			'id-app-navigation' => null,
		]);
		return $response;
	}
}
