<?php
/**
 * @copyright Copyright (c) 2016, ownCloud, Inc.
 *
 * @author Kavita sonawane<kavita.sonawane@t-systems.com>

 *
 * @license AGPL-3.0
 *
 * This code is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License, version 3,
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License, version 3,
 * along with this program. If not, see <http://www.gnu.org/licenses/>
 *
 */

namespace OCA\Nmcsharing\AppInfo;

use OCA\DAV\Connector\Sabre\Principal;
use OCP\App\IAppManager;
use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\ILogger;
use OCP\IServerContainer;

class Application extends App implements IBootstrap {
    const APP_ID = "nmcsharing";

	public function __construct(array $urlParams = []) {
		parent::__construct(self::APP_ID, $urlParams);
	}

	public function register(IRegistrationContext $context): void {
		//$context->registerCapability(Capabilities::class);

		//$context->registerServiceAlias('Expiration', Expiration::class);
		//$context->registerServiceAlias(ITrashManager::class, TrashManager::class);
		/** Register $principalBackend for the DAV collection */
		//$context->registerServiceAlias('principalBackend', Principal::class);
	}

	public function boot(IBootContext $context): void {
		\OCA\Files\App::getNavigationManager()->add(function () {
			return [
				'id' => 'nmcsharing',
				'appname' => 'nmcsharing',
				'script' => 'list.php',
				];
		});

	}
}
