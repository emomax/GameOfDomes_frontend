#include "sgct.h"

#include<string.h>
#include<stdlib.h>
#include<time.h>
#include<vector>

#include "classroom\SkyBox.h"
#include "classroom\Projectile.h"
#include "classroom\NetworkManager.h"

//! Shorter and fancier way of outputing a string.
void put(char* s) {
	cout << s << endl;
}


sgct::Engine * gEngine;

//Not using ref pointers enables
//more controlled termination
//and prevents segfault on Linux
osgViewer::Viewer * mViewer;

//Scene transforms. mRootNode is used by our osgViewer
osg::ref_ptr<osg::Group> mRootNode;
osg::ref_ptr<osg::MatrixTransform> mNavTrans;
osg::ref_ptr<osg::MatrixTransform> mSceneTrans;
osg::ref_ptr<osg::MatrixTransform> mPlayerTrans;


//Position and direction variables for the player
osg::Vec3d forward_dir;
osg::Vec3d player_pos;

osg::ref_ptr<osg::FrameStamp> mFrameStamp; //to sync osg animations across cluster


//callbacks
void myInitOGLFun();
void myPreSyncFun();
void myPostSyncPreDrawFun();
void myDrawFun();
void myEncodeFun();
void myDecodeFun();
void myCleanUpFun();
void keyCallback(int key, int action);

//other functions
void initOSG();
void setupLightSource();

//variables to share across cluster
sgct::SharedDouble curr_time(0.0);		//Current game time
sgct::SharedDouble forward_speed(0.0);	//Current player speed
sgct::SharedDouble theta(0.0);			//Spherical coordinates
sgct::SharedDouble phi(PI/2);
sgct::SharedBool wireframe(false);		//OsgExample settings
sgct::SharedBool info(false);
sgct::SharedBool stats(false);
sgct::SharedBool takeScreenshot(false);
sgct::SharedBool light(true);

//Temporary variables that will be replaced after merge with SFS
bool Buttons[7];
enum directions { FORWARD, BACKWARD, LEFT, RIGHT, UP, DOWN, SHOOT };
double navigation_speed = 0.0;
const double turn_speed = 3.0;

//vector containing all projectiles in the scene
std::vector<Projectile> missiles;

// Handle networking
NetworkManager manager;

// Set the function for what happens when we get response
// from a server extension

//! When something from a server extension is received this function is called. Could be position updating  of gameobject, a private message or just a notification. The ["cmd"] parameter of the event that is received  reveals which extension that was spitting out the info. Based on extension this function will do different things.
void NetworkManager::OnSmartFoxExtensionResponse(unsigned long long ptrContext, boost::shared_ptr<BaseEvent> ptrEvent) {
	// get pointer to main frame.
	NetworkManager* ptrMainFrame = (NetworkManager*)ptrContext;

	cout << "Item received!" << endl;

	// Check that we're still alive and running
	if (ptrMainFrame == NULL) {
		return;
	}

	// Get the cmd parameter of the event
	boost::shared_ptr<map<string, boost::shared_ptr<void>>> ptrEventParams = ptrEvent->Params();
	boost::shared_ptr<void> ptrEventParamValueCmd = (*ptrEventParams)["cmd"];
	boost::shared_ptr<string> ptrNotifiedCmd = ((boost::static_pointer_cast<string>)(ptrEventParamValueCmd));

	// check the type of the command
	if (*ptrNotifiedCmd == "ShipTransform") {
		boost::shared_ptr<void> ptrEventParamValueParams = (*ptrEventParams)["params"];
		boost::shared_ptr<ISFSObject> ptrNotifiedISFSObject = ((boost::static_pointer_cast<ISFSObject>)(ptrEventParamValueParams));
		double rotX = *(ptrNotifiedISFSObject->GetDouble("rotX"));
		double rotY = *(ptrNotifiedISFSObject->GetDouble("rotY"));

		theta.setVal(rotX * (PI / 180));
		phi.setVal(-rotY * (PI / 180));

		cout << "new rotX is: " << rotX << " and rotY is: " << rotY << endl;
	}
}


int main(int argc, char* argv[])
{
	manager.init();

	//SGCT setup
	gEngine = new sgct::Engine(argc, argv);

	gEngine->setInitOGLFunction(myInitOGLFun);
	gEngine->setPreSyncFunction(myPreSyncFun);
	gEngine->setPostSyncPreDrawFunction(myPostSyncPreDrawFun);
	gEngine->setDrawFunction(myDrawFun);
	gEngine->setCleanUpFunction(myCleanUpFun);
	gEngine->setKeyboardCallbackFunction(keyCallback);


	//fix incompability with warping and OSG
	sgct_core::ClusterManager::instance()->setMeshImplementation(sgct_core::ClusterManager::DISPLAY_LIST);

	//Initialize buttoninput
	for (int i = 0; i<7; i++)
		Buttons[i] = false;

	if (!gEngine->init())
	{
		delete gEngine;
		return EXIT_FAILURE;
	}

	//Initialize cluster-shared variables
	sgct::SharedData::instance()->setEncodeFunction(myEncodeFun);
	sgct::SharedData::instance()->setDecodeFunction(myDecodeFun);

	// Main loop
	gEngine->render();

	// Clean up
	delete gEngine;

	// Exit program
	exit(EXIT_SUCCESS);
}



/*!
* SGCT - Initialize OpenGL
*/
void myInitOGLFun()
{
	//Setup OSG scene graph and viewer.
	initOSG();

	//Generate random seed
	srand(time(NULL));

	//Skybox code needs to be cleaned up
	osg::ref_ptr<osg::Geode> geode = new osg::Geode;
	geode->addDrawable(new osg::ShapeDrawable(
		new osg::Sphere(osg::Vec3(), 90)));  //scene->getBound().radius())));
	geode->setCullingActive(false);
	osg::ref_ptr<SkyBox> skybox = new SkyBox;
	skybox->getOrCreateStateSet()->setTextureAttributeAndModes(0, new osg::TexGen);
	skybox->setEnvironmentMap(0,
		osgDB::readImageFile("textures/tobpi_maxjo_skyboxtest1_right1.png"), osgDB::readImageFile("textures/tobpi_maxjo_skyboxtest1_left2.png"),
		osgDB::readImageFile("textures/tobpi_maxjo_skyboxtest1_bottom4.png"), osgDB::readImageFile("textures/tobpi_maxjo_skyboxtest1_top3.png"),
		osgDB::readImageFile("textures/tobpi_maxjo_skyboxtest1_front5.png"), osgDB::readImageFile("textures/tobpi_maxjo_skyboxtest1_back6.png"));
	skybox->addChild(geode.get());
	
	//Initialize scene graph transforms. mRootNode is initialized in the InitOSG() function
	mNavTrans = new osg::MatrixTransform();
	mSceneTrans = new osg::MatrixTransform();
	mPlayerTrans = new osg::MatrixTransform();
	mPlayerTrans->setMatrix(osg::Matrix::identity());

	//Setup the scene graph
	mRootNode->addChild(mPlayerTrans.get());
	mRootNode->addChild(mNavTrans.get());
	mNavTrans->addChild(mSceneTrans.get());
	mSceneTrans->addChild(skybox.get());

	//Add player model
	GameObject player = GameObject((std::string)("ettplan"), osg::Vec3f(0.0, -0.5, 0.0), (std::string)("models/airplane.ive"), mPlayerTrans);

	//Låt stå för referens
	mPlayerTrans->postMult(osg::Matrix::rotate(-PI / 2.0, 1.0, 0.0, 0.0));
	mPlayerTrans->postMult(osg::Matrix::rotate(PI, 0.0, 1.0, 0.0));
	//mPlayerTrans->postMult(osg::Matrix::translate(0.0, -0.5, 0.0));
	//mPlayerTrans->preMult(osg::Matrix::scale(1.0f / bb.radius(), 1.0f / bb.radius(), 1.0f / bb.radius()));

	//Fill scene with 10 asteroids. Later this should be moved to specific scene functions for each level.
	for (int i = 0; i < 10; i++)
	{
		float rand1 = static_cast <float> (rand()) / static_cast <float> (RAND_MAX);
		float rand2 = static_cast <float> (rand()) / static_cast <float> (RAND_MAX);
		float rand3 = static_cast <float> (rand()) / static_cast <float> (RAND_MAX);
		std::cout << "Succesfully loaded asteroid: " << i << "\n";
		GameObject tempAsteroid = GameObject((std::string)("en asteroid"), osg::Vec3f(20 - rand1 * 200, rand2 * 10, rand3 * 80), (std::string)("models/asteroid.ive"), mSceneTrans);
	}

	//Setup the lightsource
	setupLightSource();
}

void myPreSyncFun()
{
	if (gEngine->isMaster())
	{
		//Update current time
		curr_time.setVal(sgct::Engine::getTime());

		//Handle key-input events
		if (Buttons[FORWARD] && navigation_speed < 0.8)
			navigation_speed += 0.01;
		if (Buttons[BACKWARD] && navigation_speed > -0.5)
			navigation_speed = -0.01;
		if (Buttons[RIGHT])
			if (theta.getVal() > 0.0)
				theta.setVal(theta.getVal() - (turn_speed * gEngine->getDt()));
			else
				theta.setVal(2*PI);
		if (Buttons[LEFT])
			if (theta.getVal() < 2*PI)
				theta.setVal(theta.getVal() + (turn_speed * gEngine->getDt()));
			else
				theta.setVal(0.0);
		if (Buttons[UP] && phi.getVal() < PI)
			phi.setVal(phi.getVal() + (turn_speed * gEngine->getDt()));
		if (Buttons[DOWN] && phi.getVal() > 0.0)
			phi.setVal(phi.getVal() - (turn_speed * gEngine->getDt()));
		if (Buttons[SHOOT])
		{
			//Add and then sort new projectiles in the missile vector.
			missiles.push_back(Projectile((std::string)("ettskott"), player_pos, -forward_dir, (std::string)("models/skott_prototyp.ive"), mSceneTrans, 1.0f, -0.3f));
			for (int i = 1; i < missiles.size(); i++)
			{
				Projectile temp = missiles[missiles.size() - i];
				missiles[missiles.size() - i] = missiles[missiles.size()-i-1];
				missiles[missiles.size()-i-1] = temp;
			}
			Buttons[SHOOT] = false;
		}
	}
}

void myPostSyncPreDrawFun()
{
	//Check OsgExample settings
	gEngine->setWireframe(wireframe.getVal());
	gEngine->setDisplayInfoVisibility(info.getVal());
	gEngine->setStatsGraphVisibility(stats.getVal());

	//Probably not very useful
	if (takeScreenshot.getVal())
	{
		gEngine->takeScreenshot();
		takeScreenshot.setVal(false);
	}

	//Enable or disable light with the L button
	light.getVal() ? mRootNode->getOrCreateStateSet()->setMode(GL_LIGHTING, osg::StateAttribute::ON | osg::StateAttribute::OVERRIDE) :
		mRootNode->getOrCreateStateSet()->setMode(GL_LIGHTING, osg::StateAttribute::OFF | osg::StateAttribute::OVERRIDE);

	//Reset navigation transform every frame
	mNavTrans->setMatrix(osg::Matrix::identity());
	
	//Rotate osg coordinate system to match sgct
	mNavTrans->preMult(osg::Matrix::rotate(-PI/2, 1.0f, 0.0f, 0.0f));

	//Set direction and position of player. forward_dir is normalized.
	forward_dir = osg::Vec3d(-sin(theta.getVal())*sin(phi.getVal()), -cos(phi.getVal()), -cos(theta.getVal())*sin(phi.getVal()));
	player_pos = player_pos + forward_dir*navigation_speed;

	//Transform the scene. Inverse is used to account for the player perspective.
	mNavTrans->postMult(osg::Matrix::rotate(theta.getVal(), 0.0, 1.0, 0.0));
	mNavTrans->postMult(osg::Matrix::rotate(phi.getVal(), cos(theta.getVal()), 0.0, -sin(theta.getVal()) ));
	mNavTrans->postMult(osg::Matrix::translate(player_pos));
	mNavTrans->setMatrix(mNavTrans->getInverseMatrix());

	//Transform to scene transformation from configuration file
	mSceneTrans->setMatrix(osg::Matrix(glm::value_ptr(gEngine->getModelMatrix())));

	

	//Move or remove missiles
	for (int i = 0; i < missiles.size(); i++)
	{
		//Reduce lifetime of missile
		missiles[i].setLifeTime(missiles[i].getLifeTime() - gEngine->getDt());
		if (missiles[i].getLifeTime() < 0.0f)
		{
			//Remove from scene graph before deleting the object
			missiles[i].removeChildModel(missiles[i].getModel());

			//Place projectile last in vector so we can use pop_back() correctly
			Projectile temp = missiles[missiles.size() - 1];
			missiles[missiles.size() - 1] = missiles[i];
			missiles[i] = temp;

			missiles.pop_back();
		}
		else
			missiles[i].translate(missiles[i].getDir()*missiles[i].getVel());
	}

	//update the frame stamp in the viewer to sync all
	//time based events in osg
	mFrameStamp->setFrameNumber(gEngine->getCurrentFrameNumber());
	mFrameStamp->setReferenceTime(curr_time.getVal());
	mFrameStamp->setSimulationTime(curr_time.getVal());
	mViewer->setFrameStamp(mFrameStamp.get());
	mViewer->advance(curr_time.getVal()); //update
	//mViewer->setCameraManipulator(nodeTracker.get());//cookbook

	//traverse if there are any tasks to do
	if (!mViewer->done())
	{
		mViewer->eventTraversal();
		//update travelsal needed for pagelod object like terrain data etc.
		mViewer->updateTraversal();
	}
}

void myDrawFun()
{
	glLineWidth(2.0f);

	const int * curr_vp = gEngine->getActiveViewportPixelCoords();
	mViewer->getCamera()->setViewport(curr_vp[0], curr_vp[1], curr_vp[2], curr_vp[3]);
	mViewer->getCamera()->setProjectionMatrix(osg::Matrix(glm::value_ptr(gEngine->getActiveViewProjectionMatrix())));

	mViewer->renderingTraversals();
}

void myEncodeFun()
{
	sgct::SharedData::instance()->writeDouble(&curr_time);
	sgct::SharedData::instance()->writeDouble(&forward_speed);
	sgct::SharedData::instance()->writeDouble(&theta);
	sgct::SharedData::instance()->writeDouble(&phi);
	sgct::SharedData::instance()->writeBool(&wireframe);
	sgct::SharedData::instance()->writeBool(&info);
	sgct::SharedData::instance()->writeBool(&stats);
	sgct::SharedData::instance()->writeBool(&takeScreenshot);
	sgct::SharedData::instance()->writeBool(&light);
}

void myDecodeFun()
{
	sgct::SharedData::instance()->readDouble(&curr_time);
	sgct::SharedData::instance()->readDouble(&forward_speed);
	sgct::SharedData::instance()->readDouble(&theta);
	sgct::SharedData::instance()->readDouble(&phi);
	sgct::SharedData::instance()->readBool(&wireframe);
	sgct::SharedData::instance()->readBool(&info);
	sgct::SharedData::instance()->readBool(&stats);
	sgct::SharedData::instance()->readBool(&takeScreenshot);
	sgct::SharedData::instance()->readBool(&light);
}

void myCleanUpFun()
{
	sgct::MessageHandler::instance()->print("Cleaning up osg data...\n");
	delete mViewer;
	mViewer = NULL;
}

//SGCT key callbacks that will be replaced after merge with SFS
void keyCallback(int key, int action)
{
	if (gEngine->isMaster())
	{
		switch (key)
		{
		case 'Z':
			if (action == SGCT_PRESS)
				stats.toggle();
			break;

		case 'I':
			if (action == SGCT_PRESS)
				info.toggle();
			break;

		case 'L':
			if (action == SGCT_PRESS)
				light.toggle();
			break;

		case 'F':
			if (action == SGCT_PRESS)
				wireframe.toggle();
			break;

		case 'T':
			if (action == SGCT_PRESS)
				gEngine->terminate();
			break;

		case 'P':
		case SGCT_KEY_F10:
			if (action == SGCT_PRESS)
				takeScreenshot.setVal(true);
			break;

		case 'Q':
			Buttons[FORWARD] = ((action == SGCT_REPEAT || action == SGCT_PRESS) ? true : false);
			break;

		case 'E':
			Buttons[BACKWARD] = ((action == SGCT_REPEAT || action == SGCT_PRESS) ? true : false);
			break;
		case 'D':
			Buttons[RIGHT] = ((action == SGCT_REPEAT || action == SGCT_PRESS) ? true : false);
			break;
		case 'A':
			Buttons[LEFT] = ((action == SGCT_REPEAT || action == SGCT_PRESS) ? true : false);
			break;
		case 'W':
			Buttons[UP] = ((action == SGCT_REPEAT || action == SGCT_PRESS) ? true : false);
			break;
		case 'S':
			Buttons[DOWN] = ((action == SGCT_REPEAT || action == SGCT_PRESS) ? true : false);
			break;
		case SGCT_KEY_SPACE:
			Buttons[SHOOT] = ((action == SGCT_REPEAT || action == SGCT_PRESS) ? true : false);
			break;
		}
	}
}

void initOSG()
{
	mRootNode = new osg::Group();
	osg::Referenced::setThreadSafeReferenceCounting(true);

	// Create the osgViewer instance
	mViewer = new osgViewer::Viewer;

	// Create a time stamp instance
	mFrameStamp = new osg::FrameStamp();

	//run single threaded when embedded
	mViewer->setThreadingModel(osgViewer::Viewer::SingleThreaded);

	// Set up osgViewer::GraphicsWindowEmbedded for this context
	osg::ref_ptr< ::osg::GraphicsContext::Traits > traits =
		new osg::GraphicsContext::Traits;

	osg::ref_ptr<osgViewer::GraphicsWindowEmbedded> graphicsWindow =
		new osgViewer::GraphicsWindowEmbedded(traits.get());

	mViewer->getCamera()->setGraphicsContext(graphicsWindow.get());

	//SGCT will handle the near and far planes
	mViewer->getCamera()->setComputeNearFarMode(osgUtil::CullVisitor::DO_NOT_COMPUTE_NEAR_FAR);
	mViewer->getCamera()->setClearColor(osg::Vec4(0.0f, 0.0f, 0.0f, 0.0f));

	//disable osg from clearing the buffers that will be done by SGCT
	GLbitfield tmpMask = mViewer->getCamera()->getClearMask();
	mViewer->getCamera()->setClearMask(tmpMask & (~(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)));

	mViewer->setSceneData(mRootNode.get());
}

void setupLightSource()
{
	osg::Light * light0 = new osg::Light;
	osg::Light * light1 = new osg::Light;
	osg::LightSource* lightSource0 = new osg::LightSource;
	osg::LightSource* lightSource1 = new osg::LightSource;

	light0->setLightNum(0);
	light0->setPosition(osg::Vec4(5.0f, 5.0f, 10.0f, 1.0f));
	light0->setAmbient(osg::Vec4(0.0f, 0.0f, 0.0f, 1.0f));
	light0->setDiffuse(osg::Vec4(0.8f, 0.8f, 0.8f, 1.0f));
	light0->setSpecular(osg::Vec4(0.1f, 0.1f, 0.1f, 1.0f));
	light0->setConstantAttenuation(1.0f);

	lightSource0->setLight(light0);
	lightSource0->setLocalStateSetModes(osg::StateAttribute::ON);
	lightSource0->setStateSetModes(*(mRootNode->getOrCreateStateSet()), osg::StateAttribute::ON);

	light1->setLightNum(1);
	light1->setPosition(osg::Vec4(-5.0f, -2.0f, 10.0f, 1.0f));
	light1->setAmbient(osg::Vec4(1.0f, 1.0f, 1.0f, 1.0f));
	light1->setDiffuse(osg::Vec4(0.5f, 0.5f, 0.5f, 1.0f));
	light1->setSpecular(osg::Vec4(0.2f, 0.2f, 0.2f, 1.0f));
	light1->setConstantAttenuation(1.0f);

	lightSource1->setLight(light1);
	lightSource1->setLocalStateSetModes(osg::StateAttribute::ON);
	lightSource1->setStateSetModes(*(mRootNode->getOrCreateStateSet()), osg::StateAttribute::ON);

	mRootNode->addChild(lightSource0);
	mRootNode->addChild(lightSource1);
}
