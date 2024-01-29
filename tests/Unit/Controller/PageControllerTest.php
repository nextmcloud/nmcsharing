<?php

namespace OCA\Nmcsharing\Tests\Unit\Controller;

use OCA\Nmcsharing\Controller\PageController;


use PHPUnit_Framework_TestCase;

class PageControllerTest extends PHPUnit_Framework_TestCase {
	private $controller;
	private $userId = 'john';

	public function setUp() {
		$request = $this->getMockBuilder('OCP\IRequest')->getMock();

		$this->controller = new PageController(
			'nmc_sharing', $request, $this->userId
		);
	}
}
