<?php

namespace OCA\Nmcsharing\Controller;

use OCP\AppFramework\Controller;
use OCP\IRequest;

class PageController extends Controller {
	private $userId;

	public function __construct($AppName, IRequest $request, $UserId) {
		parent::__construct($AppName, $request);
		$this->userId = $UserId;
	}
}
