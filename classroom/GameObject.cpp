#include "GameObject.h"

GameObject::GameObject(std::string _name, osg::Vec3f _pos, std::string _model, osg::ref_ptr<osg::MatrixTransform> _scene)
{
	initTransform();
	setVel(0.0);
	setDir(osg::Vec3f(0.0f, 0.0f, 1.0f));
	rigidBodyRadius = 1.0f;
	translate(_pos);
	scale(0.1f);
	setName(_name);
	setDescr((std::string)("hej"));
	_scene->addChild(getTrans());

	setModel(_model);
}

void GameObject::setModel(std::string _fileName)
{
	model = osgDB::readNodeFile(_fileName);

	if (model.valid())
	{
		addChildModel(model);

		//get the bounding box
		//osg::ComputeBoundsVisitor cbv;
		//osg::BoundingBox &bb(cbv.getBoundingBox());
		//model->accept(cbv);

		//disable face culling
		model->getOrCreateStateSet()->setMode(GL_CULL_FACE,
			osg::StateAttribute::OFF | osg::StateAttribute::OVERRIDE);

		//rigidBodyRadius = bb.radius();
	}
}